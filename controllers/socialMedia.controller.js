import axios from "axios";
import prisma from "../config/db.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS, AYRSHARE_ENDPOINTS, PLATFORMS, getPlatformEnum } from "../utils/constants.js";

const getOrCreateProfileKey = async (user) => {
  if (user.ayrshareProfileKey) {
    return user.ayrshareProfileKey;
  }

  if (!process.env.AYRSHARE_API_KEY) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Ayrshare API key is missing in environment variables. Please configure AYRSHARE_API_KEY."
    );
  }

  try {
    const response = await axios.post(
      AYRSHARE_ENDPOINTS.PROFILES,
      { title: user.name },
      {
        headers: {
          Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const profileKey = response.data?.profileKey;
    if (!profileKey) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve profile key from Ayrshare");
    }

    // Update in database
    await prisma.user.update({
      where: { id: user.id },
      data: { ayrshareProfileKey: profileKey },
    });

    return profileKey;
  } catch (error) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.response?.data?.message || "Failed to create Ayrshare profile"
    );
  }
};

export const connectSocialAccount = async (req, res, next) => {
  try {
    const { platform } = req.body;
    const platformEnum = req.platformEnum || getPlatformEnum(platform);
    const ayrsharePlatform = PLATFORMS[platformEnum];

    const profileKey = await getOrCreateProfileKey(req.user);

    const response = await axios.post(
      AYRSHARE_ENDPOINTS.GENERATE_JWT,
      {
        profileKey,
        expiresIn: "1h",
        allowedSocial: [ayrsharePlatform],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const linkUrl = response.data?.url;
    if (!linkUrl) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Could not generate social authorization link");
    }

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: `Authorization URL for ${platform} generated successfully`,
      data: {
        url: linkUrl,
        platform: ayrsharePlatform,
      },
    }).send(res);
  } catch (error) {
    if (error.response?.data?.message) {
      return next(new ApiError(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.response.data.message));
    }
    next(error);
  }
};

export const disconnectSocialAccount = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const platformEnum = req.platformEnum;
    const ayrsharePlatform = PLATFORMS[platformEnum];

    if (req.user.ayrshareProfileKey && process.env.AYRSHARE_API_KEY) {
      try {
        await axios.delete(AYRSHARE_ENDPOINTS.UNLINK_SOCIAL, {
          headers: {
            Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
            "Profile-Key": req.user.ayrshareProfileKey,
            "Content-Type": "application/json",
          },
          data: {
            platform: ayrsharePlatform,
          },
        });
      } catch (err) {
        console.warn(
          `Ayrshare unlink notice for ${platform}:`,
          err.response?.data?.message || err.message
        );
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
        platform: ayrsharePlatform,
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

export const syncSocialAccounts = async (req, res, next) => {
  try {
    if (!req.user.ayrshareProfileKey || !process.env.AYRSHARE_API_KEY) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot sync accounts. Ayrshare profile or API key is not configured."
      );
    }

    const response = await axios.get(AYRSHARE_ENDPOINTS.USER, {
      headers: {
        Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
        "Profile-Key": req.user.ayrshareProfileKey,
      },
    });

    const activeSocial = response.data?.activeSocialAccounts || [];
    const displayNames = response.data?.displayNames || {};

    const syncedAccounts = [];

    for (const ayrPlatform of activeSocial) {
      const platformEnum = getPlatformEnum(ayrPlatform);
      if (!platformEnum) continue;

      const displayName = displayNames[ayrPlatform] || null;

      const account = await prisma.socialAccount.upsert({
        where: {
          userId_platform: {
            userId: req.user.id,
            platform: platformEnum,
          },
        },
        update: {
          status: "CONNECTED",
          displayName,
          lastSyncedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          platform: platformEnum,
          displayName,
          status: "CONNECTED",
          connectedAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });

      syncedAccounts.push(account);
    }

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Social accounts synced successfully",
      data: syncedAccounts,
    }).send(res);
  } catch (error) {
    if (error.response?.data?.message) {
      return next(new ApiError(error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.response.data.message));
    }
    next(error);
  }
};
