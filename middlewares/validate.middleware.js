import ApiError from "../utils/apiError.js";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * Generic Zod validation middleware
 * Validates req.body against any provided Zod schema.
 * Sends the first specific validation error message instead of repeating multiple errors.
 *
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Return only the first relevant error message
    const firstErrorMessage = result.error.issues?.[0]?.message || "Invalid request data";
    return next(new ApiError(HTTP_STATUS.BAD_REQUEST, firstErrorMessage));
  }

  // Pass validated and sanitized data forward
  req.body = result.data;
  next();
};

export default validate;
