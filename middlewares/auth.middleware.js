import ApiError from "../utils/apiError.js";
import { verifyToken } from "../tokenManagement/jwtToken.js";
import prisma from "../config/db.js";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * Middleware to verify JWT and attach authenticated user to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Access denied. Authentication token required.");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication token is missing.");
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired token. Please log in again.");
    }

    // Fetch user from database (omit password)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        zernioProfileId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "User no longer exists.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
