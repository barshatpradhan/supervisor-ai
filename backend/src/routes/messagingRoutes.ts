import { Router } from "express";
import {
  addReactionHandler,
  deleteMessageHandler,
  editMessageHandler,
  listConversationMembersHandler,
  listConversationsHandler,
  listMembersHandler,
  listMessagesHandler,
  markReadHandler,
  openDirectConversationHandler,
  progressRequestHandler,
  removeReactionHandler,
  sendMessageHandler,
  unreadSummaryHandler,
} from "../controllers/messagingController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  requireOrganizationRole,
  resolveOrganizationContext,
} from "../middleware/organizationMiddleware.js";
import { createUserRateLimiter } from "../middleware/rateLimiter.js";

const MINUTE = 60_000;

// Polls skip the shared per-IP API allowance (see securityMiddleware), so they are capped here
// per user instead: generous enough for a few open tabs at the client's fastest interval.
const pollLimiter = createUserRateLimiter({ name: "messaging-poll", max: 240, windowMs: MINUTE });
const sendLimiter = createUserRateLimiter({
  name: "messaging-send",
  max: 30,
  windowMs: MINUTE,
  message: "You're sending messages too quickly. Please wait a moment and try again.",
});
const writeLimiter = createUserRateLimiter({ name: "messaging-write", max: 120, windowMs: MINUTE });

const router = Router();

router.use(
  authenticateUser,
  resolveOrganizationContext,
  requireOrganizationRole("organization_admin", "supervisor", "employee")
);

router.get("/unread-summary", pollLimiter, unreadSummaryHandler);
router.get("/members", listMembersHandler);
router.get("/conversations", listConversationsHandler);
router.post("/conversations/direct", writeLimiter, openDirectConversationHandler);
router.get("/conversations/:conversationId/members", listConversationMembersHandler);
router.get("/conversations/:conversationId/messages", pollLimiter, listMessagesHandler);
router.post("/conversations/:conversationId/messages", sendLimiter, sendMessageHandler);
router.patch("/conversations/:conversationId/messages/:messageId", writeLimiter, editMessageHandler);
router.delete("/conversations/:conversationId/messages/:messageId", writeLimiter, deleteMessageHandler);
router.post("/conversations/:conversationId/messages/:messageId/reactions", writeLimiter, addReactionHandler);
router.delete("/conversations/:conversationId/messages/:messageId/reactions/:emoji", writeLimiter, removeReactionHandler);
router.post("/conversations/:conversationId/read", writeLimiter, markReadHandler);
router.post("/progress-requests", sendLimiter, progressRequestHandler);

export default router;
