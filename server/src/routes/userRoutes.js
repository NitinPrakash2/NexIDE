import { Router } from "express";
import {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
  getPublicProfile,
  getPreferences,
  updatePreferences,
  checkUsername,
} from "../controllers/userController.js";
import { authenticate, validate } from "../middlewares/index.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  updatePreferencesSchema,
  usernameParamSchema,
} from "../validators/userValidator.js";
import { apiRateLimiter } from "../config/rateLimiter.js";

const router = Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, validate(updateProfileSchema), updateMe);
router.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.delete("/me", authenticate, deleteMe);

router.get("/me/preferences", authenticate, getPreferences);
router.patch("/me/preferences", authenticate, validate(updatePreferencesSchema), updatePreferences);

router.get("/check-username/:username", apiRateLimiter, checkUsername);
router.get("/:username", apiRateLimiter, validate(usernameParamSchema, "params"), getPublicProfile);

export default router;
