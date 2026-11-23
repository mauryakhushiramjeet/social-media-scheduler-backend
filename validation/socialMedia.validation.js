import { z } from "zod";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS, PLATFORMS, getPlatformEnum } from "../utils/constants.js";

// Zod Schema for Connecting an Account (validates platform name and checks supported platforms)
export const connectSocialSchema = z
  .object({
    platform: z.string().trim().min(1, "Platform name is required"),
    redirectUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    const platformEnum = getPlatformEnum(data.platform);
    if (!platformEnum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported platform: '${data.platform}'. Supported platforms: ${Object.values(PLATFORMS).join(", ")}`,
        path: ["platform"],
      });
    }
  });

/**
 * Middleware: Validate disconnect social account route parameter
 */
export const validateDisconnectSocial = (req, res, next) => {
  const { platform } = req.params;
  if (!platform) {
    return next(new ApiError(HTTP_STATUS.BAD_REQUEST, "Platform parameter is required"));
  }

  const platformEnum = getPlatformEnum(platform);
  if (!platformEnum) {
    return next(new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid platform: '${platform}'`));
  }

  req.platformEnum = platformEnum;
  next();
};
