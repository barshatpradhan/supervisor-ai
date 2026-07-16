import { Router } from "express";
import {
  assignTaskHandler,
  createTaskHandler,
  createTaskProgressHandler,
  getTaskHandler,
  getTasks,
  updateTaskHandler,
} from "../controllers/taskController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";

const router = Router();

router.use(authenticateUser, resolveOrganizationContext);

router.get(
  "/",
  requireOrganizationRole("organization_admin", "supervisor", "employee"),
  getTasks
);
router.get(
  "/:taskId",
  requireOrganizationRole("organization_admin", "supervisor", "employee"),
  getTaskHandler
);
router.post(
  "/",
  requireOrganizationRole("organization_admin", "supervisor"),
  createTaskHandler
);
router.patch(
  "/:taskId",
  requireOrganizationRole("organization_admin", "supervisor"),
  updateTaskHandler
);
router.patch(
  "/:taskId/assign",
  requireOrganizationRole("organization_admin", "supervisor"),
  assignTaskHandler
);
router.post(
  "/:taskId/progress",
  requireOrganizationRole("employee"),
  createTaskProgressHandler
);

export default router;
