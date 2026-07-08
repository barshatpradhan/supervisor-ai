import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  createMySupervisorProfile,
  getAssignableEmployeesHandler,
  getMySupervisorProfile,
  updateEmployeeWorkSettingsHandler,
} from "../controllers/supervisorController.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/me", authenticateUser, getMySupervisorProfile);
router.get(
  "/employees",
  authenticateUser,
  requireRole("supervisor", "admin"),
  getAssignableEmployeesHandler
);
router.post("/profile", authenticateUser, createMySupervisorProfile);
router.patch(
  "/employees/:employeeId/work-settings",
  authenticateUser,
  requireRole("supervisor", "admin"),
  updateEmployeeWorkSettingsHandler
);

export default router;
