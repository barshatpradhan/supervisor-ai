import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getMyEmployeeProfile,
  createMyEmployeeProfile,
} from "../controllers/employeeController.js";

const router = Router();

router.get("/me", authenticateUser, getMyEmployeeProfile);
router.post("/profile", authenticateUser, createMyEmployeeProfile);

export default router;