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
} from "../controllers/employeeController.js";

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
