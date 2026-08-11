import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordResetEmail,
  signupUser,
  updatePassword,
} from "../controllers/authController.js";
import {
  validateLoginRequest,
  validatePasswordReset,
  validatePasswordResetRequest,
  validateRegisterRequest,
  validateSignupRequest,
} from "../middleware/authValidation.js";

const router = Router();

router.post("/register", validateRegisterRequest, registerUser);
router.post("/signup", validateSignupRequest, signupUser);
router.post("/login", validateLoginRequest, loginUser);
router.post("/password-reset", validatePasswordResetRequest, requestPasswordResetEmail);
router.post("/password-reset/confirm", authenticateUser, validatePasswordReset, updatePassword);
router.get("/me", authenticateUser, getCurrentUser);

export default router;
