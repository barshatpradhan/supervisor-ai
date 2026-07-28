import { Router } from "express";
import {
  acceptInvitationByTokenHandler,
  inspectInvitationByTokenHandler,
  registerInvitationAccountHandler,
} from "../controllers/invitationController.js";
import {
  authenticateUser,
  authenticateUserIfPresent,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get("/:token", authenticateUserIfPresent, inspectInvitationByTokenHandler);
router.post("/:token/register", registerInvitationAccountHandler);
router.post("/:token/accept", authenticateUser, acceptInvitationByTokenHandler);

export default router;
