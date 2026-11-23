import { z } from "zod";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS, POST_SCHEDULER_PLATFORMS, POST_TYPES } from "../utils/constants.js";

// Zod Schema for Creating a Post
export const createPostSchema = z
  .object({
    caption: z.string().trim().default("").optional(),
    platforms: z
      .array(z.string().trim().toLowerCase())
      .min(1, "At least one target platform is required")
      .max(1, "You can select only one account to share a post at a time"),
    postType: z
      .enum([POST_TYPES.FEED, POST_TYPES.REEL, POST_TYPES.STORY, POST_TYPES.CAROUSEL])
      .default(POST_TYPES.FEED),
    mediaUrls: z.array(z.string().url("Each media URL must be a valid URL")).default([]),
    scheduledAt: z
      .string()
      .datetime({ message: "scheduledAt must be a valid ISO 8601 date string" })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    // Validate platform identifiers
    for (const p of data.platforms) {
      if (!POST_SCHEDULER_PLATFORMS.includes(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Platform '${p}' is not supported for posting. Supported: ${POST_SCHEDULER_PLATFORMS.join(", ")}`,
          path: ["platforms"],
        });
      }
    }

    // Story format constraint: Supported on Instagram only
    if (data.postType === POST_TYPES.STORY) {
      if (!data.platforms.every((p) => p === "instagram")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Story format is currently supported only on Instagram",
          path: ["platforms"],
        });
      }
    }

    // Caption is required for Feed, Reel, and Carousel, but not Story (Stories are media-only)
    if (data.postType !== POST_TYPES.STORY && (!data.caption || !data.caption.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Caption is required for this post format",
        path: ["caption"],
      });
    }

    // Media requirements by post type
    if ((data.postType === POST_TYPES.REEL || data.postType === POST_TYPES.STORY) && data.mediaUrls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.postType} posts require at least one media URL`,
        path: ["mediaUrls"],
      });
    }

    if (data.postType === POST_TYPES.CAROUSEL && data.mediaUrls.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CAROUSEL posts require at least 2 media URLs",
        path: ["mediaUrls"],
      });
    }

    // Schedule date must be in the future
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be a future date and time",
          path: ["scheduledAt"],
        });
      }
    }
  });

// Zod Schema for Updating a Post
export const updatePostSchema = z
  .object({
    caption: z.string().trim().min(1, "Caption cannot be empty").optional(),
    mediaUrls: z.array(z.string().url("Each media URL must be a valid URL")).optional(),
    scheduledAt: z
      .string()
      .datetime({ message: "scheduledAt must be a valid ISO 8601 date string" })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be a future date and time",
          path: ["scheduledAt"],
        });
      }
    }
  });

/**
 * Middleware: Validate Create Post Body
 */
export const validateCreatePost = (req, res, next) => {
  const result = createPostSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || [];
    const errorMessage = issues.map((i) => i.message).join(", ");
    return next(new ApiError(HTTP_STATUS.BAD_REQUEST, errorMessage));
  }
  req.body = result.data;
  next();
};

/**
 * Middleware: Validate Update Post Body
 */
export const validateUpdatePost = (req, res, next) => {
  const result = updatePostSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || [];
    const errorMessage = issues.map((i) => i.message).join(", ");
    return next(new ApiError(HTTP_STATUS.BAD_REQUEST, errorMessage));
  }
  req.body = result.data;
  next();
};
