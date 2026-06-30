import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { forgotPasswordSchema, resetPasswordSchema, verificationTokenParamSchema } from "../validators/verificationValidator.js";
import { authRateLimiter, verificationRateLimiter } from "../config/rateLimiter.js";
import {
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/verificationController.js";

const router = Router();

router.post("/send-verification", authenticate, verificationRateLimiter, sendVerificationEmail);
router.get("/verify-email/:token", validate(verificationTokenParamSchema, "params"), verifyEmail);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
