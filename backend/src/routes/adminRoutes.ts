import { Router } from "express";
import {
  grantInvitationEmailAllowanceHandler,
  createUserHandler,
  approveSkillHandler,
  getDashboardMetrics,
  getPendingSkills,
  getUserDirectory,
  getUsers,
  rejectSkillHandler,
  updateUserRole,
} from "../controllers/adminController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validateAdminCreateUserRequest } from "../middleware/authValidation.js";
import { requirePlatformRole } from "../middleware/roleMiddleware.js";
import { adminCreateUserRateLimit } from "../middleware/authRateLimiter.js";

const router = Router();

router.get(
  "/skills/pending",
  authenticateUser,
  requirePlatformRole("platform_admin"),
  getPendingSkills
);
router.patch(
  "/skills/:skillId/approve",
  authenticateUser,
  requirePlatformRole("platform_admin"),
  approveSkillHandler
);
router.delete(
  "/skills/:skillId",
  authenticateUser,
  requirePlatformRole("platform_admin"),
  rejectSkillHandler
);

router.use(authenticateUser, requirePlatformRole("platform_admin"));

router.get("/dashboard", getDashboardMetrics);

router.get("/users", getUsers);
router.get("/users/directory", getUserDirectory);
router.post("/users", adminCreateUserRateLimit, validateAdminCreateUserRequest, createUserHandler);
router.patch("/users/:userId/role", updateUserRole);
router.post("/invitation-email-allowances", grantInvitationEmailAllowanceHandler);

export default router;
