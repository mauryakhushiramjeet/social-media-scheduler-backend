import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import ApiResponse from "./utils/apiResponse.js";
import { HTTP_STATUS } from "./utils/constants.js";
import authRoutes from "./routes/auth.routes.js";
import socialMediaRoutes from "./routes/socialMedia.routes.js";
import postRoutes from "./routes/post.routes.js";
import mediaRoutes from "./routes/media.routes.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check route
app.get("/", (req, res) => {
  return new ApiResponse({
    statusCode: HTTP_STATUS.OK,
    message: "Social Media Management API is running",
    data: {
      timestamp: new Date().toISOString(),
    },
  }).send(res);
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/social", socialMediaRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/media", mediaRoutes);

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  // Handle Zod validation errors: return one single clear error message
  if (err instanceof ZodError) {
    const singleErrorMessage = err.issues?.[0]?.message || "Validation failed";
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: singleErrorMessage,
      data: null,
    });
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: null,
  });
});

export default app;
