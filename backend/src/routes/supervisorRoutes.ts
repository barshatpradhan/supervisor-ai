import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  createMySupervisorProfile,
  getAssignableEmployeesHandler,
  getMySupervisorProfile,
  updateMySupervisorProfile,
  updateEmployeeWorkSettingsHandler,
} from "../controllers/supervisorController.js";
import { getSupervisorDashboardHandler } from "../controllers/dashboardController.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/dashboard",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getSupervisorDashboardHandler
);

router.get(
  "/me",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getMySupervisorProfile
);
router.patch(
  "/me",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  updateMySupervisorProfile
);
router.get(
  "/employees",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getAssignableEmployeesHandler
);
router.post(
  "/profile",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  createMySupervisorProfile
);
router.patch(
  "/employees/:employeeId/work-settings",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  updateEmployeeWorkSettingsHandler
);

export default router;
