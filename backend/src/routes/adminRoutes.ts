import { Router } from "express";
import {
  createUserHandler,
  approveSkillHandler,
  getPendingSkills,
  getUsers,
  rejectSkillHandler,
  updateUserRole,
} from "../controllers/adminController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validateAdminCreateUserRequest } from "../middleware/authValidation.js";
import { requirePlatformRole } from "../middleware/roleMiddleware.js";
import { sendSuccess } from "../utils/apiResponse.js";

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

router.get(
  "/dashboard",
  (req, res) => {
    return sendSuccess(res, 200, "Welcome admin.");
  }
);

router.get("/users", getUsers);
router.post("/users", validateAdminCreateUserRequest, createUserHandler);
router.patch("/users/:userId/role", updateUserRole);

export default router;
