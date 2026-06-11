import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  createMySupervisorProfile,
  getMySupervisorProfile,
} from "../controllers/supervisorController.js";

const router = Router();

router.get("/me", authenticateUser, getMySupervisorProfile);
router.post("/profile", authenticateUser, createMySupervisorProfile);

export default router;
