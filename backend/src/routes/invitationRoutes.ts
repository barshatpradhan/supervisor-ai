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
import {
  invitationAcceptRateLimit,
  invitationInspectRateLimit,
  invitationRegisterRateLimit,
} from "../middleware/authRateLimiter.js";

const router = Router();

// Per-IP limits before anything else, to stop token scanning.
router.get("/:token", invitationInspectRateLimit, authenticateUserIfPresent, inspectInvitationByTokenHandler);
router.post("/:token/register", invitationRegisterRateLimit, registerInvitationAccountHandler);
router.post("/:token/accept", invitationAcceptRateLimit, authenticateUser, acceptInvitationByTokenHandler);

export default router;
