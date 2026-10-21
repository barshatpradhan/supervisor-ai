import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createUserRateLimiter, isMessagingPollRequest } from "../middleware/securityMiddleware.js";
import { AppError } from "../utils/appError.js";
import { isAllowedEmoji } from "../utils/emoji.js";
import {
  decodeMessageCursor,
  directConversationKey,
  encodeMessageCursor,
  normalizeMessageBody,
  parseMentionUserIds,
} from "../utils/messageText.js";

test("message bodies are trimmed, stripped of control characters and length-checked", () => {
  assert.equal(normalizeMessageBody("  hi\r\nthere\u0007  "), "hi\nthere");
  assert.equal(normalizeMessageBody("<b>kept as text</b>"), "<b>kept as text</b>");
  assert.throws(() => normalizeMessageBody("   "), AppError);
  assert.throws(() => normalizeMessageBody(42), AppError);
  assert.throws(() => normalizeMessageBody("x".repeat(4001)), AppError);
  assert.equal(normalizeMessageBody("x".repeat(4000)).length, 4000);
});

test("mention tokens are parsed once each, case-insensitively", () => {
  const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
  assert.deepEqual(parseMentionUserIds(`<@${id}> and <@${id.toUpperCase()}> and <@not-a-uuid>`), [id]);
});

test("direct conversation keys do not depend on who starts the conversation", () => {
  assert.equal(directConversationKey("b", "a"), directConversationKey("a", "b"));
});

test("cursors round-trip and reject tampering", () => {
  const cursor = { createdAt: "2026-10-21T17:00:00.123456+00:00", id: "0f8fad5b-d9cb-469f-a165-70867728950e" };
  assert.deepEqual(decodeMessageCursor(encodeMessageCursor(cursor)), cursor);
  assert.throws(() => decodeMessageCursor("not-a-cursor"), AppError);
  assert.equal(decodeMessageCursor(undefined), undefined);
});

test("only curated emoji are accepted", () => {
  assert.ok(isAllowedEmoji("👍"));
  assert.ok(!isAllowedEmoji("<script>"));
  assert.ok(!isAllowedEmoji("👍👍"));
});

test("only the two polling GETs are treated as polls", () => {
  const poll = (method: string, path: string, query: Record<string, unknown> = {}) =>
    isMessagingPollRequest({ method, path, query } as unknown as Request);

  assert.ok(poll("GET", "/api/v1/messaging/unread-summary"));
  assert.ok(poll("GET", "/api/v1/messaging/conversations/abc/messages", { updatedSince: "2026-01-01" }));
  assert.ok(!poll("GET", "/api/v1/messaging/conversations/abc/messages"));
  assert.ok(!poll("POST", "/api/v1/messaging/conversations/abc/messages", { updatedSince: "x" }));
  assert.ok(!poll("GET", "/api/v1/tasks"));
});

test("the per-user send limiter allows the limit and then answers 429, per user", () => {
  const limiter = createUserRateLimiter({ name: "test-send", max: 30, windowMs: 60_000 });
  const headers: Record<string, unknown> = {};
  const res = { setHeader: (name: string, value: unknown) => { headers[name] = value; } } as unknown as Response;

  const send = (userId: string) => {
    let result: unknown = "not called";
    limiter({ user: { id: userId }, ip: "127.0.0.1" } as unknown as Request, res, ((error?: unknown) => {
      result = error;
    }) as NextFunction);
    return result;
  };

  for (let index = 0; index < 30; index += 1) assert.equal(send("user-1"), undefined);
  const blocked = send("user-1");
  assert.ok(blocked instanceof AppError && blocked.statusCode === 429);
  assert.ok(Number(headers["Retry-After"]) > 0);
  assert.equal(send("user-2"), undefined, "another user has their own allowance");
});
