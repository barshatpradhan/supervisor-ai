import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";
import {
  getMyEmployeeProfile,
  createMyEmployeeProfile,
  getApprovedSkills,
  updateMyEmployeeProfile,
  getMyTasks,
} from "../controllers/employeeController.js";
import { getEmployeeDashboardHandler } from "../controllers/dashboardController.js";

const router = Router();

router.get(
  "/skills",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor", "employee"),
  getApprovedSkills
);
router.get(
  "/me",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  getMyEmployeeProfile
);
router.get(
  "/me/tasks",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  getMyTasks
);
router.get(
  "/me/dashboard",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  getEmployeeDashboardHandler
);
router.patch(
  "/me",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  updateMyEmployeeProfile
);
router.post(
  "/profile",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  createMyEmployeeProfile
);

export default router;
