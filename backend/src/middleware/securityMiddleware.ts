import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { env } from "../config/environment.js";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `${req.ip}:${req.path.startsWith("/api/v1/auth") ? "auth" : "api"}`;
  const now = Date.now();
  const entry = attempts.get(key);
  const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + env.rateLimitWindowMs } : entry;
  current.count += 1;
  attempts.set(key, current);
  res.setHeader("RateLimit-Limit", env.rateLimitMax);
  res.setHeader("RateLimit-Remaining", Math.max(0, env.rateLimitMax - current.count));
  if (current.count > env.rateLimitMax) return next(new AppError("Too many requests. Please try again later.", 429));
  next();
}
