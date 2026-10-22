import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordResetEmail,
  signupUser,
  updateMyAvatar,
  updatePassword,
} from "../controllers/authController.js";
import { createUserRateLimiter } from "../middleware/rateLimiter.js";
import { env } from "../config/environment.js";
import {
  validateLoginRequest,
  validatePasswordReset,
  validatePasswordResetRequest,
  validateRegisterRequest,
  validateSignupRequest,
} from "../middleware/authValidation.js";
import {
  loginRateLimit,
  passwordResetConfirmRateLimit,
  passwordResetRateLimit,
  registerRateLimit,
} from "../middleware/authRateLimiter.js";

const router = Router();

// Auth limiters run first, so malformed and unauthenticated attempts count too.
router.post("/register", registerRateLimit, validateRegisterRequest, registerUser);
router.post("/signup", registerRateLimit, validateSignupRequest, signupUser);
router.post("/login", loginRateLimit, validateLoginRequest, loginUser);
router.post("/password-reset", passwordResetRateLimit, validatePasswordResetRequest, requestPasswordResetEmail);
router.post("/password-reset/confirm", passwordResetConfirmRateLimit, authenticateUser, validatePasswordReset, updatePassword);
router.get("/me", authenticateUser, getCurrentUser);

// Per-user limit on avatar changes (after authentication, keyed by the verified user id).
const avatarUpdateLimit = createUserRateLimiter({
  name: "avatar-update",
  max: env.authRateLimits.avatarUpdateMax,
  windowMs: env.authRateLimits.avatarUpdateWindowMs,
  maxKeys: env.rateLimitMaxKeys,
  message: "Too many avatar changes. Please wait a moment and try again.",
});
router.patch("/me/avatar", authenticateUser, avatarUpdateLimit, updateMyAvatar);

export default router;
