import prisma from "../config/db.js";
import zernio from "../config/zernio.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import {
  HTTP_STATUS,
  PLATFORMS,
  getPlatformEnum,
  POST_TYPES,
  POST_STATUS,
} from "../utils/constants.js";


export const createPost = async (req, res, next) => {
  try {
    const { caption = "", platforms, postType, mediaUrls, scheduledAt } = req.body;
    const userId = req.user.id;
    const profileId = req.user.zernioProfileId;

    if (!profileId && process.env.ZERNIO_API_KEY) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No Zernio profile found. Please connect your social media accounts first."
      );
    }

    const platformEnums = platforms.map((p) => getPlatformEnum(p)).filter(Boolean);

    const connectedAccounts = await prisma.socialAccount.findMany({
      where: {
        userId,
        platform: { in: platformEnums },
        status: "CONNECTED",
      },
    });

    let zernioPostId = null;
    let initialStatus = scheduledAt ? POST_STATUS.SCHEDULED : POST_STATUS.PUBLISHED;

    // Call Zernio API if API key is present
    if (process.env.ZERNIO_API_KEY) {
      try {
        // Build Zernio platforms array with accountId and platform-specific options
        const zernioPlatforms = platforms.map((p) => {
          const platformEnum = getPlatformEnum(p);
          const targetAcc = connectedAccounts.find((a) => a.platform === platformEnum);

          const entry = {
            platform: PLATFORMS[platformEnum] || p,
            accountId: targetAcc?.accountId || targetAcc?.id || "default",
          };

          if (p === "instagram") {
            if (postType === POST_TYPES.STORY) {
              entry.platformSpecificData = {
                contentType: "story",
              };
            } else if (postType === POST_TYPES.REEL) {
              entry.platformSpecificData = {
                shareToFeed: true,
              };
            }
          }

          return entry;
        });

        const postBody = {
          content: postType === POST_TYPES.STORY ? "" : (caption || ""),
          platforms: zernioPlatforms,
          mediaItems: (mediaUrls || []).map((url) => ({ url })),
        };

        if (scheduledAt) {
          postBody.scheduledFor = new Date(scheduledAt).toISOString();
          postBody.timezone = "Asia/Kolkata";
        } else {
          postBody.publishNow = true;
        }

        const { data } = await zernio.posts.createPost({
          body: postBody,
        });

        zernioPostId = data?.post?._id || data?.post?.id || data?._id || data?.id || null;
      } catch (err) {
        console.error("Zernio publishing error:", err?.message || err);
        initialStatus = POST_STATUS.FAILED;

        const errorMsg =
          err?.body?.error ||
          err?.body?.message ||
          err?.message ||
          "Failed to schedule or publish post via Zernio";
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, errorMsg);
      }
    }

    const newPost = await prisma.post.create({
      data: {
        userId,
        caption: postType === POST_TYPES.STORY ? "" : (caption || ""),
        postType,
        mediaUrls: mediaUrls || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: initialStatus,
        zernioPostId,
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.CREATED,
      message: scheduledAt ? "Post scheduled successfully via Zernio" : "Post published successfully via Zernio",
      data: newPost,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, postType } = req.query;

    const where = { userId };
    if (status) where.status = status;
    if (postType) where.postType = postType;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Posts retrieved successfully",
      data: posts,
    }).send(res);
  } catch (error) {
    next(error);
  }
};


export const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!post) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Post not found");
    }

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Post details retrieved",
      data: post,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, mediaUrls, scheduledAt } = req.body;

    const post = await prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Post not found");
    }

    if (post.status === POST_STATUS.PUBLISHED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot edit a post that has already been published"
      );
    }

    if (post.zernioPostId && process.env.ZERNIO_API_KEY) {
      try {
        await zernio.posts.updatePost({
          path: {
            postId: post.zernioPostId,
          },
          body: {
            ...(caption && { content: caption }),
            ...(mediaUrls && { mediaItems: mediaUrls.map((url) => ({ url })) }),
            ...(scheduledAt && {
              scheduledFor: new Date(scheduledAt).toISOString(),
              timezone: "Asia/Kolkata",
            }),
          },
        });
      } catch (err) {
        console.warn("Zernio updatePost notice:", err?.message || err);
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...(caption !== undefined && { caption }),
        ...(mediaUrls !== undefined && { mediaUrls }),
        ...(scheduledAt !== undefined && {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? POST_STATUS.SCHEDULED : post.status,
        }),
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Post updated successfully",
      data: updatedPost,
    }).send(res);
  } catch (error) {
    next(error);
  }
};


export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify post ownership
    const post = await prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Post not found");
    }

    // If post has a Zernio ID, cancel it from Zernio queue
    if (post.zernioPostId && process.env.ZERNIO_API_KEY) {
      try {
        await zernio.posts.deletePost({
          path: {
            postId: post.zernioPostId,
          },
        });
      } catch (err) {
        console.warn("Zernio post cancellation notice:", err?.message || err);
      }
    }

    // Delete post record from PostgreSQL
    await prisma.post.delete({
      where: { id },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Post deleted successfully",
      data: { id },
    }).send(res);
  } catch (error) {
    next(error);
  }
};
