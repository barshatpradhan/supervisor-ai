import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { env } from "../config/environment.js";
import { type Bucket, consume, isMessagingPollRequest } from "./rateLimiter.js";

const attempts = new Map<string, Bucket>();

// Messaging polls are frequent by design, so they get their own per-IP bucket (and a per-user
// limiter on the route) instead of using up the shared API allowance.
const MESSAGING_POLL_IP_MULTIPLIER = 5;

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
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
