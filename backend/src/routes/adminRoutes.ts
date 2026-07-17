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
import { requireRole } from "../middleware/roleMiddleware.js";
import { sendSuccess } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/skills/pending",
  authenticateUser,
  requireRole("admin"),
  getPendingSkills
);
router.patch(
  "/skills/:skillId/approve",
  authenticateUser,
  requireRole("admin"),
  approveSkillHandler
);
router.delete(
  "/skills/:skillId",
  authenticateUser,
  requireRole("admin"),
  rejectSkillHandler
);

router.use(authenticateUser, requireRole("admin"));

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
