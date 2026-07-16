import { Router } from "express";
import {
  getEmployeeDashboardHandler,
  getSupervisorDashboardHandler,
} from "../controllers/dashboardController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";

const router = Router();

router.get(
  "/supervisor",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor"),
  getSupervisorDashboardHandler
);

router.get(
  "/employee",
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("employee"),
  getEmployeeDashboardHandler
);

export default router;
