import bcrypt from "bcrypt";
import axios from "axios";
import prisma from "../config/db.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { generateToken } from "../tokenManagement/jwtToken.js";
import { HTTP_STATUS, AYRSHARE_ENDPOINTS } from "../utils/constants.js";

/**
 * Register a new user
 * POST /api/auth/register
 * Request body is pre-validated by Zod middleware: validate(registerSchema)
 */
export const register = async (req, res, next) => {
  try {
    // Sanitized and validated via Zod middleware
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "An account with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Ayrshare profile if API key is present
    let ayrshareProfileKey = null;
    if (process.env.AYRSHARE_API_KEY) {
      try {
        const ayrshareResponse = await axios.post(
          AYRSHARE_ENDPOINTS.PROFILES,
          { title: name },
          {
            headers: {
              Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (ayrshareResponse.data && ayrshareResponse.data.profileKey) {
          ayrshareProfileKey = ayrshareResponse.data.profileKey;
        }
      } catch (err) {
        console.warn(
          "Ayrshare profile creation notice:",
          err.response?.data?.message || err.message
        );
      }
    }

    // Create user in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ayrshareProfileKey,
      },
    });

    // Generate JWT token
    const token = generateToken({ id: newUser.id, email: newUser.email });

    // Exclude password and ayrshareProfileKey from response
    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    return new ApiResponse({
      statusCode: HTTP_STATUS.CREATED,
      message: "User registered successfully",
      data: {
        user: safeUser,
        token,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 * Request body is pre-validated by Zod middleware: validate(loginSchema)
 */
export const login = async (req, res, next) => {
  try {
    // Sanitized and validated via Zod middleware
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid email or password");
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    // Exclude password and ayrshareProfileKey from response
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Login successful",
      data: {
        user: safeUser,
        token,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const safeUser = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
    };

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "User profile fetched successfully",
      data: {
        user: safeUser,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};
