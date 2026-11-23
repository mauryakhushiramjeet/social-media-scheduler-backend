import express from "express";
import cors from "cors";
import ApiResponse from "./utils/apiResponse.js";
import ApiError from "./utils/apiError.js";

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
app.get("/api/health", (req, res) => {
  return new ApiResponse({
    statusCode: 200,
    message: "Social Media Management API is running",
    data: {
      status: "online",
      timestamp: new Date().toISOString(),
      service: "social-media-scheduler-backend",
    },
  }).send(res);
});

// Demo route to demonstrate ApiError handling
app.get("/api/test-error", (req, res) => {
  throw new ApiError(400, "Demo ApiError: Invalid email or password");
});

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: null,
  });
});

export default app;
