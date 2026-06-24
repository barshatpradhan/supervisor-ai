import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  createMySupervisorProfile,
  getMySupervisorProfile,
  updateEmployeeWorkSettingsHandler,
} from "../controllers/supervisorController.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/me", authenticateUser, getMySupervisorProfile);
router.post("/profile", authenticateUser, createMySupervisorProfile);
router.patch(
  "/employees/:employeeId/work-settings",
  authenticateUser,
  requireRole("supervisor", "admin"),
  updateEmployeeWorkSettingsHandler
);

export default router;
