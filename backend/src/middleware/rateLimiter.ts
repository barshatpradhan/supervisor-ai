import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { MemoryRateLimitStore } from "./rateLimitStore.js";

/** Per-store key cap for limiters that cannot read env (this module must stay env-free). */
const DEFAULT_MAX_KEYS = 50_000;

const MESSAGING_THREAD_PATH = /^\/api\/v1\/messaging\/conversations\/[^/]+\/messages$/;

export function isMessagingPollRequest(req: Pick<Request, "method" | "path" | "query">) {
  if (req.method !== "GET") return false;
  if (req.path === "/api/v1/messaging/unread-summary") return true;
  return MESSAGING_THREAD_PATH.test(req.path) && typeof req.query?.updatedSince === "string";
}

/**
 * A per-user limiter for one kind of request. Must run after authenticateUser.
 * In-memory (bounded, see MemoryRateLimitStore), so each server instance counts separately.
 */
export function createUserRateLimiter(options: {
  name: string;
  max: number;
  windowMs: number;
  message?: string;
  maxKeys?: number;
}) {
  const store = new MemoryRateLimitStore({ maxKeys: options.maxKeys ?? DEFAULT_MAX_KEYS });

  return function userRateLimit(req: Request, res: Response, next: NextFunction) {
    const subject = req.user?.id ?? `ip:${req.ip}`;
    const current = store.hit(`${options.name}:${subject}`, options.windowMs);

    if (current.count > options.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000)));
      return next(new AppError(options.message ?? "Too many requests. Please try again later.", 429));
    }

    next();
  };
}
