import { Router } from "express";
import { getSupervisorDashboardHandler } from "../controllers/dashboardController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/supervisor",
  authenticateUser,
  requireRole("admin", "supervisor"),
  getSupervisorDashboardHandler
);

export default router;
