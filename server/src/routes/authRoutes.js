import { Router } from "express";
import { register, login, logout, refresh, getMe, googleAuth, githubAuth } from "../controllers/authController.js";
import { authenticate, validate } from "../middlewares/index.js";
import { registerSchema, loginSchema, googleAuthSchema, githubAuthSchema } from "../validators/authValidator.js";
import { authRateLimiter } from "../config/rateLimiter.js";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/google", authRateLimiter, validate(googleAuthSchema), googleAuth);
router.post("/github", authRateLimiter, validate(githubAuthSchema), githubAuth);
router.get("/me", authenticate, getMe);

export default router;
