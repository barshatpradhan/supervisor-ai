import type { NextFunction, Request, Response } from "express";
import {
  addReaction,
  deleteMessage,
  editMessage,
  getOrCreateDirectConversation,
  getUnreadSummary,
  listConversationMembers,
  listConversations,
  listMembers,
  listMessageChanges,
  listMessages,
  markConversationRead,
  removeReaction,
  requestTaskProgress,
  sendMessage,
} from "../services/messagingService.js";
import type { MessagingActor } from "../types/messaging.js";
import { AppError } from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { optionalUuid, requireBody, requireString, requireUuid } from "../utils/validation.js";

/** The caller, taken only from the verified organization context. */
function actorFrom(req: Request): MessagingActor {
  if (!req.appUser || !req.organization || !req.membership) {
    throw new AppError("Organization context is required.", 500);
  }

  return {
    userId: req.appUser.id,
    organizationId: req.organization.id,
    role: req.membership.role,
    memberSince: req.membership.joined_at ?? req.membership.created_at,
  };
}

function conversationIdFrom(req: Request) {
  return requireUuid(req.params.conversationId, "Conversation id");
}

function messageIdFrom(req: Request) {
  return requireUuid(req.params.messageId, "Message id");
}

function handle(
  successMessage: string,
  action: (req: Request, actor: MessagingActor) => Promise<unknown>,
  status = 200
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await action(req, actorFrom(req));
      return sendSuccess(res, status, successMessage, data);
    } catch (error) {
      return next(error);
    }
  };
}

export const listConversationsHandler = handle("Conversations fetched successfully.", (_req, actor) =>
  listConversations(actor)
);

export const unreadSummaryHandler = handle("Unread summary fetched successfully.", (_req, actor) =>
  getUnreadSummary(actor)
);

export const listMembersHandler = handle("Members fetched successfully.", (_req, actor) => listMembers(actor));

export const listConversationMembersHandler = handle("Conversation members fetched successfully.", (req, actor) =>
  listConversationMembers(actor, conversationIdFrom(req))
);

export const openDirectConversationHandler = handle("Direct conversation opened successfully.", (req, actor) => {
  const body = requireBody(req.body);
  return getOrCreateDirectConversation(actor, requireUuid(body.userId, "userId"));
});

export const listMessagesHandler = handle("Messages fetched successfully.", (req, actor) => {
  const conversationId = conversationIdFrom(req);
  const { cursor, limit, updatedSince } = req.query;

  if (updatedSince !== undefined) {
    if (typeof updatedSince !== "string") throw new AppError("updatedSince must be a timestamp.", 400);
    return listMessageChanges(actor, conversationId, updatedSince);
  }

  const parsedLimit = limit === undefined ? undefined : Number(limit);
  if (parsedLimit !== undefined && !Number.isInteger(parsedLimit)) {
    throw new AppError("limit must be a whole number.", 400);
  }

  return listMessages(actor, conversationId, { cursor, limit: parsedLimit });
});

export const sendMessageHandler = handle(
  "Message sent successfully.",
  (req, actor) => {
    const body = requireBody(req.body);
    return sendMessage(actor, conversationIdFrom(req), {
      body: body.body,
      clientId: optionalUuid(body, "clientId"),
      taskId: optionalUuid(body, "taskId"),
    });
  },
  201
);

export const editMessageHandler = handle("Message updated successfully.", (req, actor) => {
  const body = requireBody(req.body);
  return editMessage(actor, conversationIdFrom(req), messageIdFrom(req), body.body);
});

export const deleteMessageHandler = handle("Message deleted successfully.", (req, actor) =>
  deleteMessage(actor, conversationIdFrom(req), messageIdFrom(req))
);

export const addReactionHandler = handle("Reaction added successfully.", (req, actor) => {
  const body = requireBody(req.body);
  return addReaction(actor, conversationIdFrom(req), messageIdFrom(req), requireString(body, "emoji", "Emoji"));
});

export const removeReactionHandler = handle("Reaction removed successfully.", (req, actor) => {
  const emoji = req.params.emoji;
  if (typeof emoji !== "string" || emoji.length === 0) throw new AppError("Emoji is required.", 400);
  return removeReaction(actor, conversationIdFrom(req), messageIdFrom(req), emoji);
});

export const markReadHandler = handle("Conversation marked as read.", (req, actor) => {
  const body = req.body === undefined ? {} : requireBody(req.body);
  return markConversationRead(actor, conversationIdFrom(req), optionalUuid(body, "messageId"));
});

export const progressRequestHandler = handle(
  "Progress request sent successfully.",
  (req, actor) => {
    const body = requireBody(req.body);
    return requestTaskProgress(actor, requireUuid(body.taskId, "taskId"));
  },
  201
);
