import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

export interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

const MESSAGING_THREAD_PATH = /^\/api\/v1\/messaging\/conversations\/[^/]+\/messages$/;

/** Counts one request against `key`; returns the bucket after counting. */
export function consume(store: Map<string, Bucket>, key: string, windowMs: number, now = Date.now()) {
  if (store.size > MAX_TRACKED_KEYS) {
    for (const [storedKey, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(storedKey);
    }
  }

  const entry = store.get(key);
  const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
  current.count += 1;
  store.set(key, current);
  return current;
}

export function isMessagingPollRequest(req: Pick<Request, "method" | "path" | "query">) {
  if (req.method !== "GET") return false;
  if (req.path === "/api/v1/messaging/unread-summary") return true;
  return MESSAGING_THREAD_PATH.test(req.path) && typeof req.query?.updatedSince === "string";
}

/**
 * A per-user limiter for one kind of request. Must run after authenticateUser.
 * In-memory, so each server instance counts separately.
 */
export function createUserRateLimiter(options: {
  name: string;
  max: number;
  windowMs: number;
  message?: string;
}) {
  const store = new Map<string, Bucket>();

  return function userRateLimit(req: Request, res: Response, next: NextFunction) {
    const subject = req.user?.id ?? `ip:${req.ip}`;
    const current = consume(store, `${options.name}:${subject}`, options.windowMs);

    if (current.count > options.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((current.resetAt - Date.now()) / 1000)));
      return next(new AppError(options.message ?? "Too many requests. Please try again later.", 429));
    }

    next();
  };
}
