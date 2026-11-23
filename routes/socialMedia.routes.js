import { Router } from "express";
import {
  connectSocialAccount,
  disconnectSocialAccount,
  getSocialAccounts,
  syncSocialAccounts,
} from "../controllers/socialMedia.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  connectSocialSchema,
  validateDisconnectSocial,
} from "../validation/socialMedia.validation.js";

const router = Router();

// Protect all social media endpoints with JWT authentication
router.use(authenticate);

router.post("/connect", validate(connectSocialSchema), connectSocialAccount);
router.delete("/disconnect/:platform", validateDisconnectSocial, disconnectSocialAccount);
router.get("/accounts", getSocialAccounts);
router.post("/sync", syncSocialAccounts);

export default router;
