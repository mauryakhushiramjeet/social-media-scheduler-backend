import bcrypt from "bcrypt";
import prisma from "../config/db.js";
import zernio from "../config/zernio.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { generateToken } from "../tokenManagement/jwtToken.js";
import { HTTP_STATUS } from "../utils/constants.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    let zernioProfileId = null;
    if (process.env.ZERNIO_API_KEY) {
      try {
        const { data } = await zernio.profiles.createProfile({
          body: {
            name: `Customer ${newUser.id}`,
            externalId: newUser.id,
            timezone: "Asia/Kolkata",
          },
        });
        zernioProfileId = data?.profile?._id || data?.profile?.id || data?._id || data?.id || null;

        if (zernioProfileId) {
          await prisma.user.update({
            where: { id: newUser.id },
            data: { zernioProfileId },
          });
        }
      } catch (err) {
        console.warn(
          "Zernio profile creation notice:",
          err?.message || err
        );
      }
    }

    const token = generateToken({ id: newUser.id, email: newUser.email });

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


export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid email or password");
    }

    const token = generateToken({ id: user.id, email: user.email });

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
