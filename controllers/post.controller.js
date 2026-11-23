import axios from "axios";
import prisma from "../config/db.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import {
  HTTP_STATUS,
  AYRSHARE_ENDPOINTS,
  POST_TYPES,
  POST_STATUS,
} from "../utils/constants.js";

const buildAyrsharePayload = ({ caption, platforms, postType, mediaUrls, scheduledAt }) => {
  const payload = {
    post: caption,
    platforms,
  };

  if (mediaUrls && mediaUrls.length > 0) {
    payload.mediaUrls = mediaUrls;
  }

  // Attach scheduled date if post is to be scheduled
  if (scheduledAt) {
    payload.scheduleDate = new Date(scheduledAt).toISOString();
  }

  // Instagram-specific formatting
  if (platforms.includes("instagram")) {
    if (postType === POST_TYPES.REEL) {
      payload.instagramOptions = {
        reel: true,
        shareToFeed: true,
      };
    } else if (postType === POST_TYPES.STORY) {
      payload.instagramOptions = {
        story: true,
      };
    }
  }

  return payload;
};

export const createPost = async (req, res, next) => {
  try {
    const { caption, platforms, postType, mediaUrls, scheduledAt } = req.body;
    const userId = req.user.id;
    const profileKey = req.user.ayrshareProfileKey;

    let ayrsharePostId = null;
    let initialStatus = scheduledAt ? POST_STATUS.SCHEDULED : POST_STATUS.PUBLISHED;

    // Send post to Ayrshare if user has profileKey and API key is set
    if (profileKey && process.env.AYRSHARE_API_KEY) {
      try {
        const payload = buildAyrsharePayload({
          caption,
          platforms,
          postType,
          mediaUrls,
          scheduledAt,
        });

        const ayrshareResponse = await axios.post(AYRSHARE_ENDPOINTS.POST, payload, {
          headers: {
            Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
            "Profile-Key": profileKey,
            "Content-Type": "application/json",
          },
        });

        ayrsharePostId = ayrshareResponse.data?.id || null;
      } catch (err) {
        console.error("Ayrshare publishing error:", err.response?.data || err.message);
        initialStatus = POST_STATUS.FAILED;

        // Throw error if user explicitly needs publishing to succeed immediately
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to publish post via Ayrshare";
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, errorMsg);
      }
    } else if (!profileKey) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You must connect your social media profile before creating posts."
      );
    }

    // Save post record in PostgreSQL using Prisma
    const newPost = await prisma.post.create({
      data: {
        userId,
        caption,
        postType,
        mediaUrls: mediaUrls || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: initialStatus,
        ayrsharePostId,
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.CREATED,
      message: scheduledAt ? "Post scheduled successfully" : "Post published successfully",
      data: newPost,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all posts for the authenticated user
 * GET /api/posts
 */
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

/**
 * Get a single post by ID (must belong to authenticated user)
 * GET /api/posts/:id
 */
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

/**
 * Update a scheduled post
 * PATCH /api/posts/:id
 */
export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { caption, mediaUrls, scheduledAt } = req.body;

    // Verify post ownership
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

    // Update in database
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

/**
 * Delete a post (cancels on Ayrshare and deletes from database)
 * DELETE /api/posts/:id
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const profileKey = req.user.ayrshareProfileKey;

    // Verify post ownership
    const post = await prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Post not found");
    }

    // If post has an Ayrshare ID and Ayrshare key is configured, cancel on Ayrshare
    if (post.ayrsharePostId && profileKey && process.env.AYRSHARE_API_KEY) {
      try {
        await axios.delete(AYRSHARE_ENDPOINTS.POST, {
          headers: {
            Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
            "Profile-Key": profileKey,
            "Content-Type": "application/json",
          },
          data: {
            id: post.ayrsharePostId,
          },
        });
      } catch (err) {
        console.warn(
          "Ayrshare post cancellation notice:",
          err.response?.data?.message || err.message
        );
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
