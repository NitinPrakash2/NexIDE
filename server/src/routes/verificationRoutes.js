import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { forgotPasswordSchema, resetPasswordSchema } from "../validators/verificationValidator.js";
import { authRateLimiter } from "../config/rateLimiter.js";
import {
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/verificationController.js";

const router = Router();

router.post("/send-verification", authenticate, sendVerificationEmail);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
