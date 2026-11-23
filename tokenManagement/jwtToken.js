import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "social_media_scheduler_super_secret_jwt_key";

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to embed in token (e.g. { id, email })
 * @param {string} expiresIn - Expiry time (defaults to "7d")
 */
export const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT string
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
