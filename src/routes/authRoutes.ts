import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getCurrentUser,
  loginUser,
  signupUser,
} from "../controllers/authController.js";
import {
  validateLoginRequest,
  validateSignupRequest,
} from "../middleware/authValidation.js";

const router = Router();

router.post("/signup", validateSignupRequest, signupUser);
router.post("/login", validateLoginRequest, loginUser);
router.get("/me", authenticateUser, getCurrentUser);

export default router;
