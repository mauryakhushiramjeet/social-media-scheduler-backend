import { Router } from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPostSchema,
  updatePostSchema,
} from "../validation/post.validation.js";

const router = Router();

// Protect all post scheduling routes with JWT authentication
router.use(authenticate);

router.post("/", validate(createPostSchema), createPost);
router.get("/", getPosts);
router.get("/:id", getPostById);
router.patch("/:id", validate(updatePostSchema), updatePost);
router.delete("/:id", deletePost);

export default router;
