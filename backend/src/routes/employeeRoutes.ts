import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getMyEmployeeProfile,
  createMyEmployeeProfile,
  getApprovedSkills,
  updateMyEmployeeProfile,
} from "../controllers/employeeController.js";

const router = Router();

router.get("/skills", authenticateUser, getApprovedSkills);
router.get("/me", authenticateUser, getMyEmployeeProfile);
router.patch("/me", authenticateUser, updateMyEmployeeProfile);
router.post("/profile", authenticateUser, createMyEmployeeProfile);

export default router;
