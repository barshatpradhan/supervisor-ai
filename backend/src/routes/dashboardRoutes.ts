import { Router } from "express";
import {
  getEmployeeDashboardHandler,
  getSupervisorDashboardHandler,
} from "../controllers/dashboardController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/supervisor",
  authenticateUser,
  requireRole("admin", "supervisor"),
  getSupervisorDashboardHandler
);

router.get(
  "/employee",
  authenticateUser,
  requireRole("employee"),
  getEmployeeDashboardHandler
);

export default router;
