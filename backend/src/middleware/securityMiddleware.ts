import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { env } from "../config/environment.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

// Messaging polls are frequent by design, so they get their own per-IP bucket (and a per-user
// limiter on the route) instead of using up the shared API allowance.
const MESSAGING_POLL_IP_MULTIPLIER = 5;
const MESSAGING_THREAD_PATH = /^\/api\/v1\/messaging\/conversations\/[^/]+\/messages$/;

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
}

/** Counts one request against `key`; returns the bucket after counting. */
function consume(store: Map<string, Bucket>, key: string, windowMs: number, now = Date.now()) {
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

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const isPoll = isMessagingPollRequest(req);
  const scope = isPoll ? "poll" : req.path.startsWith("/api/v1/auth") ? "auth" : "api";
  const max = isPoll ? env.rateLimitMax * MESSAGING_POLL_IP_MULTIPLIER : env.rateLimitMax;
  const current = consume(attempts, `${req.ip}:${scope}`, env.rateLimitWindowMs);

  res.setHeader("RateLimit-Limit", max);
  res.setHeader("RateLimit-Remaining", Math.max(0, max - current.count));
  if (current.count > max) return next(new AppError("Too many requests. Please try again later.", 429));
  next();
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
