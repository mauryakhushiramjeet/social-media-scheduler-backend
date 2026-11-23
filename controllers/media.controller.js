import axios from "axios";
import zernio from "../config/zernio.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * 1-Step Direct Upload: Receives file from Frontend via Multer,
 * requests a presigned URL from Zernio, uploads the buffer, and returns the public HTTPS URL.
 * POST /api/media/upload
 */
export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No file uploaded. Please select an image or video.");
    }

    if (!process.env.ZERNIO_API_KEY) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Zernio API key is not configured in environment variables."
      );
    }

    // Normalize content type (e.g. image/jpg -> image/jpeg)
    let contentType = req.file.mimetype;
    if (contentType === "image/jpg") {
      contentType = "image/jpeg";
    }

    const filename = req.file.originalname || `upload-${Date.now()}`;
    const size = req.file.size;

    // 1. Get Presigned Upload URL from Zernio
    const { data: presignData } = await zernio.media.getMediaPresignedUrl({
      body: {
        filename,
        contentType,
        size,
      },
    });

    const uploadUrl = presignData?.uploadUrl;
    const publicUrl = presignData?.publicUrl;

    if (!uploadUrl || !publicUrl) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to generate media storage URL");
    }

    // 2. Upload file buffer to Zernio Cloud Storage
    await axios.put(uploadUrl, req.file.buffer, {
      headers: {
        "Content-Type": contentType,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // 3. Return the real public HTTPS URL
    return new ApiResponse({
      statusCode: HTTP_STATUS.CREATED,
      message: "Media uploaded successfully",
      data: {
        url: publicUrl,
        key: presignData.key,
        filename,
        contentType,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * 2-Step Presigned URL: Returns uploadUrl and publicUrl directly so
 * frontend can upload directly to cloud storage if desired.
 * POST /api/media/presign
 */
export const getPresignedUrl = async (req, res, next) => {
  try {
    const { filename, contentType, size } = req.body;

    if (!filename || !contentType) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "filename and contentType are required to generate a presigned URL"
      );
    }

    if (!process.env.ZERNIO_API_KEY) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Zernio API key is not configured in environment variables."
      );
    }

    let normalizedContentType = contentType;
    if (normalizedContentType === "image/jpg") {
      normalizedContentType = "image/jpeg";
    }

    const { data } = await zernio.media.getMediaPresignedUrl({
      body: {
        filename,
        contentType: normalizedContentType,
        size: size ? Number(size) : undefined,
      },
    });

    return new ApiResponse({
      statusCode: HTTP_STATUS.OK,
      message: "Presigned URL generated successfully",
      data: {
        uploadUrl: data?.uploadUrl,
        publicUrl: data?.publicUrl,
        key: data?.key,
        expiresIn: data?.expiresIn || 3600,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};
