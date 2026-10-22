/**
 * Behaviour of the global per-IP limiter and the per-user limiter, written against the original
 * implementation and kept unchanged when both moved onto MemoryRateLimitStore. Each case uses its
 * own IP or user so the module-level counters never interfere.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

// The global limiter reads env; give it fake, non-secret values before it loads.
process.env.SUPABASE_URL ??= "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-only-not-a-key";
process.env.RATE_LIMIT_MAX = "120";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const { rateLimit } = await import("./securityMiddleware.js");
const { createUserRateLimiter } = await import("./rateLimiter.js");
const { AppError } = await import("../utils/appError.js");

interface Outcome {
  error: unknown;
  headers: Record<string, unknown>;
}

function call(
  middleware: (req: never, res: never, next: (error?: unknown) => void) => void,
  req: { ip: string; method?: string; path: string; query?: Record<string, unknown>; user?: { id: string } }
): Outcome {
  const headers: Record<string, unknown> = {};
  let error: unknown;
  const res = { setHeader: (name: string, value: unknown) => { headers[name] = value; } };
  middleware({ method: "GET", query: {}, ...req } as never, res as never, (passed?: unknown) => { error = passed; });
  return { error, headers };
}

function isTooMany(error: unknown) {
  return error instanceof AppError && error.statusCode === 429 && error.message === "Too many requests. Please try again later.";
}

let ipCounter = 0;
const freshIp = () => `198.51.100.${++ipCounter}`;

beforeEach(() => mock.timers.enable({ apis: ["Date"], now: 1_000_000 }));
afterEach(() => mock.timers.reset());

describe("global per-IP limiter", () => {
  test("allows RATE_LIMIT_MAX requests per window with RateLimit headers, then answers 429", () => {
    const ip = freshIp();
    for (let index = 1; index <= 120; index += 1) {
      const { error, headers } = call(rateLimit, { ip, path: "/api/v1/projects" });
      assert.equal(error, undefined, `request ${index}`);
      assert.equal(headers["RateLimit-Limit"], 120);
      assert.equal(headers["RateLimit-Remaining"], 120 - index);
    }
    const blocked = call(rateLimit, { ip, path: "/api/v1/projects" });
    assert.ok(isTooMany(blocked.error));
    assert.equal(blocked.headers["RateLimit-Remaining"], 0);
    assert.equal(blocked.headers["Retry-After"], undefined, "the global limiter has never sent Retry-After");
  });

  test("the window resets after RATE_LIMIT_WINDOW_MS", () => {
    const ip = freshIp();
    for (let index = 0; index < 121; index += 1) call(rateLimit, { ip, path: "/api/v1/tasks" });
    assert.ok(isTooMany(call(rateLimit, { ip, path: "/api/v1/tasks" }).error));

    mock.timers.tick(59_999);
    assert.ok(isTooMany(call(rateLimit, { ip, path: "/api/v1/tasks" }).error), "still inside the window");
    mock.timers.tick(1);
    const fresh = call(rateLimit, { ip, path: "/api/v1/tasks" });
    assert.equal(fresh.error, undefined);
    assert.equal(fresh.headers["RateLimit-Remaining"], 119);
  });

  test("auth, api and poll requests from one IP use separate buckets", () => {
    const ip = freshIp();
    for (let index = 0; index < 120; index += 1) call(rateLimit, { ip, path: "/api/v1/projects" });
    assert.ok(isTooMany(call(rateLimit, { ip, path: "/api/v1/projects" }).error), "api bucket full");

    assert.equal(call(rateLimit, { ip, method: "POST", path: "/api/v1/auth/login" }).error, undefined, "auth bucket separate");
    const poll = call(rateLimit, { ip, path: "/api/v1/messaging/unread-summary" });
    assert.equal(poll.error, undefined, "poll bucket separate");
    assert.equal(poll.headers["RateLimit-Limit"], 600);
  });

  test("polls get five times the limit, only for the two messaging poll requests", () => {
    const ip = freshIp();
    const thread = "/api/v1/messaging/conversations/3c1d1a52-3e0b-4f5e-9d1a-2f6c4c0f8a11/messages";
    for (let index = 0; index < 600; index += 1) {
      const path = index % 2 ? "/api/v1/messaging/unread-summary" : thread;
      assert.equal(call(rateLimit, { ip, path, query: index % 2 ? {} : { updatedSince: "2026-01-01T00:00:00Z" } }).error, undefined);
    }
    assert.ok(isTooMany(call(rateLimit, { ip, path: "/api/v1/messaging/unread-summary" }).error));

    // Not polls: they count against the normal api bucket.
    const other = freshIp();
    assert.equal(call(rateLimit, { ip: other, path: thread }).headers["RateLimit-Limit"], 120, "thread page without updatedSince");
    assert.equal(call(rateLimit, { ip: other, method: "POST", path: "/api/v1/messaging/unread-summary" }).headers["RateLimit-Limit"], 120, "POST");
  });

  test("auth routes can never be treated as polls", () => {
    const ip = freshIp();
    for (let index = 0; index < 120; index += 1) {
      call(rateLimit, { ip, path: "/api/v1/auth/login", query: { updatedSince: "x" } });
    }
    const blocked = call(rateLimit, { ip, path: "/api/v1/auth/login", query: { updatedSince: "x" } });
    assert.equal(blocked.headers["RateLimit-Limit"], 120);
    assert.ok(isTooMany(blocked.error));
  });

  test("different IPs are counted separately", () => {
    const first = freshIp();
    for (let index = 0; index < 121; index += 1) call(rateLimit, { ip: first, path: "/api/v1/projects" });
    assert.ok(isTooMany(call(rateLimit, { ip: first, path: "/api/v1/projects" }).error));
    assert.equal(call(rateLimit, { ip: freshIp(), path: "/api/v1/projects" }).error, undefined);
  });
});

describe("per-user limiter", () => {
  test("limits each user separately, sends Retry-After and the custom message", () => {
    const limiter = createUserRateLimiter({ name: "behaviour", max: 3, windowMs: 60_000, message: "Slow down." });
    for (let index = 0; index < 3; index += 1) {
      assert.equal(call(limiter, { ip: "203.0.113.1", path: "/x", user: { id: "user-a" } }).error, undefined);
    }
    const blocked = call(limiter, { ip: "203.0.113.1", path: "/x", user: { id: "user-a" } });
    assert.ok(blocked.error instanceof AppError && blocked.error.statusCode === 429 && blocked.error.message === "Slow down.");
    assert.equal(blocked.headers["Retry-After"], 60);

    assert.equal(call(limiter, { ip: "203.0.113.1", path: "/x", user: { id: "user-b" } }).error, undefined, "another user");

    mock.timers.tick(60_000);
    assert.equal(call(limiter, { ip: "203.0.113.1", path: "/x", user: { id: "user-a" } }).error, undefined, "new window");
  });

  test("falls back to the IP when there is no user", () => {
    const limiter = createUserRateLimiter({ name: "anonymous", max: 1, windowMs: 1_000 });
    assert.equal(call(limiter, { ip: "203.0.113.9", path: "/x" }).error, undefined);
    assert.ok(isTooMany(call(limiter, { ip: "203.0.113.9", path: "/x" }).error));
    assert.equal(call(limiter, { ip: "203.0.113.10", path: "/x" }).error, undefined);
  });
});
