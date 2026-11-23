import prisma from "../config/db.js";
import zernio from "../config/zernio.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS, PLATFORMS, getPlatformEnum } from "../utils/constants.js";


const getOrCreateProfileId = async (user) => {
  if (user.zernioProfileId) {
    return user.zernioProfileId;
  }

  if (!process.env.ZERNIO_API_KEY) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Zernio API key is not configured in environment variables."
    );
  }

  try {
    const { data } = await zernio.profiles.createProfile({
      body: {
        name: `Customer ${user.id}`,
        externalId: user.id,
        timezone: "Asia/Kolkata",
      },
    });

    const profileId = data?.profile?._id || data?.profile?.id || data?._id || data?.id;
    if (!profileId) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve profile ID from Zernio");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { zernioProfileId: profileId },
    });

    return profileId;
  } catch (error) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error?.message || "Failed to create Zernio customer profile"
    );
  }
};

export const connectSocialAccount = async (req, res, next) => {
  try {
    const { platform } = req.body;
    const platformEnum = req.platformEnum || getPlatformEnum(platform);
    const zernioPlatform = PLATFORMS[platformEnum];

    const profileId = await getOrCreateProfileId(req.user);

    const clientOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    let redirectUrl =
      req.body.redirectUrl ||
      (clientOrigin ? `${clientOrigin}/social/callback` : null) ||
      process.env.CLIENT_REDIRECT_URL ||
      "http://localhost:5173/social/callback";

    if (redirectUrl.includes(":3000")) {
      redirectUrl = redirectUrl.replace(":3000", ":5173");
    }

    const { data } = await zernio.connect.getConnectUrl({
      path: {
        platform: zernioPlatform,
      },
      query: {
        profileId,
        redirect_url: redirectUrl,
        redirectUrl: redirectUrl,
      },
    });

    const connectUrl = data?.authUrl;
    if (!connectUrl) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Could not generate authorization URL from Zernio");
    }

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: `Authorization URL for ${platform} generated successfully`,
      data: {
        url: connectUrl,
        platform: zernioPlatform,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

export const disconnectSocialAccount = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const platformEnum = req.platformEnum || getPlatformEnum(platform);
    const zernioPlatform = PLATFORMS[platformEnum];

    const existingAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_platform: {
          userId: req.user.id,
          platform: platformEnum,
        },
      },
    });

    if (existingAccount?.accountId && process.env.ZERNIO_API_KEY) {
      try {
        await zernio.accounts.deleteAccount({
          path: {
            accountId: existingAccount.accountId,
          },
        });
      } catch (err) {
        console.warn(`Zernio deleteAccount notice for ${platform}:`, err?.message || err);
      }
    }

    await prisma.socialAccount.updateMany({
      where: {
        userId: req.user.id,
        platform: platformEnum,
      },
      data: {
        status: "DISCONNECTED",
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: `${platform} account disconnected successfully`,
      data: {
        platform: zernioPlatform,
        status: "DISCONNECTED",
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

export const getSocialAccounts = async (req, res, next) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        accountId: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        connectedAt: true,
        lastSyncedAt: true,
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Connected social accounts retrieved",
      data: accounts,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Sync connected social accounts with Zernio
 * POST /api/social/sync
 */
export const syncSocialAccounts = async (req, res, next) => {
  try {
    let profileId =
      req.user.zernioProfileId ||
      req.body?.profileId ||
      req.query?.profileId;

    if (!profileId && req.user.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      profileId = dbUser?.zernioProfileId;
    }

    if (profileId && req.user.id && !req.user.zernioProfileId) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { zernioProfileId: profileId },
      });
    }

    // Direct account upsert if callback params are present
    const connectedPlatform = req.body?.connected || req.query?.connected;
    if (connectedPlatform) {
      const platformEnum = getPlatformEnum(connectedPlatform);
      if (platformEnum) {
        const directAccountId = req.body?.accountId || req.query?.accountId || null;
        const directUsername = req.body?.username || req.query?.username || null;
        await prisma.socialAccount.upsert({
          where: {
            userId_platform: {
              userId: req.user.id,
              platform: platformEnum,
            },
          },
          update: {
            accountId: directAccountId,
            username: directUsername,
            displayName: directUsername,
            status: "CONNECTED",
            lastSyncedAt: new Date(),
          },
          create: {
            userId: req.user.id,
            platform: platformEnum,
            accountId: directAccountId,
            username: directUsername,
            displayName: directUsername,
            status: "CONNECTED",
            connectedAt: new Date(),
            lastSyncedAt: new Date(),
          },
        });
      }
    }

    if (!profileId || !process.env.ZERNIO_API_KEY) {
      const localAccounts = await prisma.socialAccount.findMany({
        where: { userId: req.user.id },
      });
      return new ApiResponse({
        statusCode: HTTP_STATUS.OK,
        message: "Social accounts synced from local session",
        data: localAccounts,
      }).send(res);
    }

    // List all accounts under the user's Zernio profile
    const response = await zernio.accounts.listAccounts({
      query: {
        profileId,
      },
    });

    const accountsList = response.data?.accounts || response.data || [];
    const syncedAccounts = [];

    for (const acc of accountsList) {
      const platformEnum = getPlatformEnum(acc.platform);
      if (!platformEnum) continue;

      const accountId = acc._id || acc.id || null;
      const username = acc.username || acc.handle || null;
      const displayName = acc.displayName || acc.name || null;
      const isConnected = acc.status !== "disconnected";

      const account = await prisma.socialAccount.upsert({
        where: {
          userId_platform: {
            userId: req.user.id,
            platform: platformEnum,
          },
        },
        update: {
          accountId,
          username,
          displayName,
          status: isConnected ? "CONNECTED" : "DISCONNECTED",
          lastSyncedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          platform: platformEnum,
          accountId,
          username,
          displayName,
          status: isConnected ? "CONNECTED" : "DISCONNECTED",
          connectedAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });

      syncedAccounts.push(account);
    }

    const allAccounts = await prisma.socialAccount.findMany({
      where: { userId: req.user.id },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Social accounts synced successfully from Zernio",
      data: allAccounts,
    }).send(res);
  } catch (error) {
    next(error);
  }
};
