import { AppError } from "./appError.js";

export const MESSAGE_MAX_LENGTH = 4000;

/** Mentions are stored in the body as <@user-uuid> and rendered as names by the client. */
const MENTION_TOKEN = /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/gi;
// Control characters other than tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Normalizes message text. Bodies are stored and returned as plain text and the client renders
 * them as text nodes, never as HTML, so no markup is interpreted anywhere.
 */
export function normalizeMessageBody(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("Message text is required.", 400);
  }

  const body = value.replace(/\r\n?/g, "\n").replace(CONTROL_CHARACTERS, "").trim();

  if (body.length === 0) {
    throw new AppError("Message text is required.", 400);
  }

  if (body.length > MESSAGE_MAX_LENGTH) {
    throw new AppError(`Messages can be at most ${MESSAGE_MAX_LENGTH} characters.`, 400);
  }

  return body;
}

export function parseMentionUserIds(body: string) {
  return [...new Set([...body.matchAll(MENTION_TOKEN)].map((match) => match[1].toLowerCase()))];
}

export function mentionToken(userId: string) {
  return `<@${userId}>`;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}

export function encodeMessageCursor(cursor: MessageCursor) {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString("base64url");
}

export function decodeMessageCursor(value: unknown): MessageCursor | undefined {
  if (value === undefined || value === "") return undefined;

  if (typeof value !== "string") {
    throw new AppError("cursor is invalid.", 400);
  }

  const [createdAt, id, ...rest] = Buffer.from(value, "base64url").toString("utf8").split("|");

  if (
    rest.length > 0 ||
    !createdAt ||
    Number.isNaN(Date.parse(createdAt)) ||
    !/^[0-9a-f-]{36}$/i.test(id ?? "")
  ) {
    throw new AppError("cursor is invalid.", 400);
  }

  return { createdAt, id };
}

/** The sorted pair of user ids that identifies a direct conversation, whoever starts it. */
export function directConversationKey(firstUserId: string, secondUserId: string) {
  return [firstUserId.toLowerCase(), secondUserId.toLowerCase()].sort().join(":");
}
