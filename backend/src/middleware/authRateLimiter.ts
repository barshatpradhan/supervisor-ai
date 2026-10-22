import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/environment.js";
import { AppError } from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { clientIpKey, emailKey, maskEmail, maskIpKey, normalizeEmail } from "./clientIdentity.js";
import { incrementMetric } from "./observabilityMiddleware.js";
import { MemoryRateLimitStore, type RateLimitStore } from "./rateLimitStore.js";

/**
 * Limits for abusable auth endpoints, on top of the global per-IP limiter. Every block answers
 * 429 with the same generic message and a Retry-After header; which counter tripped is only ever
 * logged. Counters never consult whether an account exists, so they cannot reveal it.
 */
export const AUTH_RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a moment and try again.";

export function tooManyAuthAttempts(retryAfterSeconds: number) {
  return new AppError(AUTH_RATE_LIMIT_MESSAGE, 429, true, { retryAfterSeconds });
}

interface Counter {
  /** Name used in logs and metrics only. */
  limiter: string;
  key: string;
  max: number;
  /** Window length, or "day" for a window that ends at the next UTC midnight. */
  window: number | "day";
  /** Masked identifier for logs. */
  identifier: string;
}

// One bounded store per counter type: rotating emails can only evict email entries, never the
// per-IP counters.
const stores = new Map<string, MemoryRateLimitStore>();

function storeFor(limiter: string): RateLimitStore {
  let store = stores.get(limiter);
  if (!store) {
    store = new MemoryRateLimitStore({ maxKeys: env.rateLimitMaxKeys });
    stores.set(limiter, store);
  }
  return store;
}

/** Clears every auth counter (tests). Restarting the process has the same effect in production. */
export function resetAuthRateLimits() {
  for (const store of stores.values()) store.reset();
  stores.clear();
}

function windowMs(window: Counter["window"], now: number) {
  if (window !== "day") return window;
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now;
}

function secondsUntil(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

/**
 * Checks every counter and, when all have room, counts one hit in each. Runs synchronously (no
 * await between check and count), so concurrent requests cannot slip past a limit together.
 * Returns the counters that are already full; nothing is counted then.
 */
function reserve(counters: Counter[], now: number) {
  const full = counters.filter((counter) => (storeFor(counter.limiter).peek(counter.key, now)?.count ?? 0) >= counter.max);
  if (full.length) return full;
  for (const counter of counters) storeFor(counter.limiter).hit(counter.key, windowMs(counter.window, now), now);
  return [];
}

function reject(req: Request, next: NextFunction, route: string, tripped: Counter[], now: number) {
  const retryAfterSeconds = Math.max(
    ...tripped.map((counter) => secondsUntil(storeFor(counter.limiter).peek(counter.key, now)?.resetAt ?? now, now))
  );
  for (const counter of tripped) {
    logger.warn("auth_rate_limited", {
      requestId: req.requestId,
      route,
      limiter: counter.limiter,
      retryAfterSeconds,
      identifier: counter.identifier,
    });
    incrementMetric("auth_rate_limited_total", { route, limiter: counter.limiter });
  }
  next(tooManyAuthAttempts(retryAfterSeconds));
}

function ipCounter(limiter: string, req: Request, max: number, window: Counter["window"]): Counter {
  const ip = clientIpKey(req.ip);
  return { limiter, key: ip, max, window, identifier: maskIpKey(ip) };
}

function emailCounter(limiter: string, email: string, max: number, window: Counter["window"]): Counter[] {
  return email ? [{ limiter, key: emailKey(email), max, window, identifier: maskEmail(email) }] : [];
}

/** A limiter that counts every attempt (successful or not) against each counter. */
function countingLimiter(route: string, counters: (req: Request) => Counter[]): RequestHandler {
  return function authRateLimit(req, _res, next) {
    const now = Date.now();
    const tripped = reserve(counters(req), now);
    if (tripped.length) return reject(req, next, route, tripped, now);
    next();
  };
}

const limits = env.authRateLimits;
const bodyEmail = (req: Request) => normalizeEmail((req.body as { email?: unknown } | undefined)?.email);

/**
 * Login: per IP, per email and per IP+email pair, counting failed attempts only. Each attempt
 * reserves a hit in all three up front (so parallel guesses cannot overshoot) and settles when the
 * response is done: a wrong password (401) keeps it; a success refunds the IP and email hits and
 * clears the pair; anything else (validation error, upstream rate limit, outage) refunds all three.
 */
export const loginRateLimit: RequestHandler = (req, res, next) => {
  const route = "login";
  const now = Date.now();
  const email = bodyEmail(req);
  const ip = ipCounter("login_ip", req, limits.loginIpMax, limits.loginWindowMs);
  const counters = [
    ip,
    ...emailCounter("login_email", email, limits.loginEmailMax, limits.loginWindowMs),
    ...(email
      ? [{ limiter: "login_pair", key: `${ip.key}|${emailKey(email)}`, max: limits.loginPairMax, window: limits.loginPairWindowMs, identifier: `${ip.identifier}|${maskEmail(email)}` }]
      : []),
  ];

  const tripped = reserve(counters, now);
  if (tripped.length) return reject(req, next, route, tripped, now);

  res.once("close", () => settleLogin(counters, res));
  next();
};

function settleLogin(counters: Counter[], res: Response) {
  const status = res.writableFinished ? res.statusCode : 0;
  if (status === 401) return; // a failed attempt: keep the reservation
  for (const counter of counters) {
    const store = storeFor(counter.limiter);
    if (status >= 200 && status < 300 && counter.limiter === "login_pair") store.clear(counter.key);
    else store.refund(counter.key);
  }
}

/** Register (and the legacy signup): every attempt counts, per IP and per email. */
export const registerRateLimit = countingLimiter("register", (req) => [
  ipCounter("register_ip", req, limits.registerIpMax, limits.registerWindowMs),
  ...emailCounter("register_email", bodyEmail(req), limits.registerEmailMax, limits.registerWindowMs),
]);

/**
 * Password-reset request: per IP, per email per hour, per email per UTC day, and a daily total for
 * the whole app. Every request that passes may send an email (we cannot tell whether the account
 * exists without revealing it), so all of them count toward the daily caps.
 */
export const passwordResetRateLimit = countingLimiter("password_reset", (req) => {
  const email = bodyEmail(req);
  return [
    ipCounter("reset_ip", req, limits.resetIpMax, limits.resetIpWindowMs),
    ...emailCounter("reset_email", email, limits.resetEmailMax, limits.resetEmailWindowMs),
    ...emailCounter("reset_email_daily", email, limits.resetEmailDailyMax, "day"),
    { limiter: "reset_daily_total", key: "all", max: limits.resetDailyTotalMax, window: "day", identifier: "all" },
  ];
});

export const passwordResetConfirmRateLimit = countingLimiter("password_reset_confirm", (req) => [
  ipCounter("reset_confirm_ip", req, limits.resetConfirmIpMax, limits.resetIpWindowMs),
]);

export const invitationInspectRateLimit = countingLimiter("invitation_inspect", (req) => [
  ipCounter("invitation_inspect_ip", req, limits.invitationInspectIpMax, limits.invitationWindowMs),
]);

export const invitationRegisterRateLimit = countingLimiter("invitation_register", (req) => [
  ipCounter("invitation_register_ip", req, limits.invitationRegisterIpMax, limits.invitationWindowMs),
]);

export const invitationAcceptRateLimit = countingLimiter("invitation_accept", (req) => [
  ipCounter("invitation_accept_ip", req, limits.invitationAcceptIpMax, limits.invitationWindowMs),
]);

/** Platform-admin user creation sends an invitation email; per admin. Runs after authentication. */
export const adminCreateUserRateLimit = countingLimiter("admin_create_user", (req) => {
  const subject = req.appUser?.id ?? req.user?.id;
  return subject
    ? [{ limiter: "admin_create_user", key: subject, max: limits.adminCreateUserMax, window: limits.adminCreateUserWindowMs, identifier: `user:${subject.slice(0, 8)}` }]
    : [ipCounter("admin_create_user_ip", req, limits.adminCreateUserMax, limits.adminCreateUserWindowMs)];
});
