import { Router } from "express";
import {authenticateUser } from "../middleware/authMiddleware.js";
import { getCurrentUser } from "../controllers/authController.js";

const router = Router();

router.get("/me", authenticateUser, getCurrentUser);

export default router;