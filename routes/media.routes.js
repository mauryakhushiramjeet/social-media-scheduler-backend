import { Router } from "express";
import multer from "multer";
import { uploadMedia, getPresignedUrl } from "../controllers/media.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Configure Multer for in-memory file buffers (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// Protect all media endpoints with JWT authentication
router.use(authenticate);

// 1-step direct file upload (Easiest for Frontend)
router.post("/upload", upload.single("file"), uploadMedia);

// 2-step presigned URL generator
router.post("/presign", getPresignedUrl);

export default router;
