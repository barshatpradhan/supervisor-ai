/**
 * Unit tests for the auth limiters, driving the middleware directly with fake requests and
 * responses and fake timers. Small limits come from the env vars the limiter reads.
 */
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

process.env.SUPABASE_URL ??= "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-only-not-a-key";
Object.assign(process.env, {
  RATE_LIMIT_MAX_KEYS: "50",
  AUTH_RL_LOGIN_WINDOW_MS: "900000",
  AUTH_RL_LOGIN_IP_MAX: "8",
  AUTH_RL_LOGIN_EMAIL_MAX: "5",
  AUTH_RL_LOGIN_PAIR_WINDOW_MS: "600000",
  AUTH_RL_LOGIN_PAIR_MAX: "3",
  AUTH_RL_RESET_IP_MAX: "50",
  AUTH_RL_RESET_EMAIL_MAX: "2",
  AUTH_RL_RESET_EMAIL_WINDOW_MS: "3600000",
  AUTH_RL_RESET_EMAIL_DAILY_MAX: "3",
  AUTH_RL_RESET_DAILY_TOTAL_MAX: "6",
});

const limiter = await import("./authRateLimiter.js");
const { AppError } = await import("../utils/appError.js");
const { metricsText } = await import("./observabilityMiddleware.js");

type Middleware = (req: never, res: never, next: (error?: unknown) => void) => void;

/** Runs one request through a limiter; for login, finishes it with `status` (0 = aborted). */
function attempt(middleware: Middleware, ip: string, body: Record<string, unknown> = {}, status = 401) {
  const res = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: false });
  let error: unknown = "not called";
  middleware({ ip, body, requestId: "test" } as never, res as never, (passed?: unknown) => { error = passed; });
  if (error === undefined) {
    res.statusCode = status;
    res.writableFinished = status !== 0;
    res.emit("close");
  }
  return error;
}

const blocked = (error: unknown) =>
  error instanceof AppError && error.statusCode === 429 && error.message === limiter.AUTH_RATE_LIMIT_MESSAGE;

const login = limiter.loginRateLimit as unknown as Middleware;
const reset = limiter.passwordResetRateLimit as unknown as Middleware;

let logs: string[] = [];
beforeEach(() => {
  limiter.resetAuthRateLimits();
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 22, 12, 0, 0) });
  logs = [];
  mock.method(console, "warn", (line: string) => { logs.push(String(line)); });
});
afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
  limiter.resetAuthRateLimits();
});

describe("login limiter", () => {
  test("the IP+email pair is the strictest counter and reopens when its window ends", () => {
    for (let index = 0; index < 3; index += 1) assert.equal(attempt(login, "203.0.113.1", { email: "a@example.com" }), undefined);
    const error = attempt(login, "203.0.113.1", { email: "a@example.com" });
    assert.ok(blocked(error));
    assert.equal((error as InstanceType<typeof AppError>).retryAfterSeconds, 600);

    mock.timers.tick(599_000);
    assert.ok(blocked(attempt(login, "203.0.113.1", { email: "a@example.com" })), "still inside the window");
    mock.timers.tick(1_000);
    assert.equal(attempt(login, "203.0.113.1", { email: "a@example.com" }), undefined, "window over");
  });

  test("only failed attempts count; a success clears the pair counter but not the per-IP counter", () => {
    attempt(login, "203.0.113.2", { email: "a@example.com" });
    attempt(login, "203.0.113.2", { email: "a@example.com" });
    attempt(login, "203.0.113.2", { email: "a@example.com" }, 200); // success

    // Pair cleared: three more failures are allowed for a@example.com from this IP.
    for (let index = 0; index < 3; index += 1) assert.equal(attempt(login, "203.0.113.2", { email: "a@example.com" }), undefined);
    assert.ok(blocked(attempt(login, "203.0.113.2", { email: "a@example.com" })));

    // The per-IP counter kept all five failures (2 + 3), so only 3 more fit under 8.
    for (let index = 0; index < 3; index += 1) assert.equal(attempt(login, "203.0.113.2", { email: `other${index}@example.com` }), undefined);
    assert.ok(blocked(attempt(login, "203.0.113.2", { email: "fresh@example.com" })), "per-IP limit reached");
  });

  test("validation errors, upstream rate limits, outages and aborted requests never count", () => {
    for (const status of [400, 429, 503, 0, 400, 429, 503, 0]) {
      assert.equal(attempt(login, "203.0.113.3", { email: "a@example.com" }, status), undefined, `status ${status}`);
    }
    for (let index = 0; index < 3; index += 1) assert.equal(attempt(login, "203.0.113.3", { email: "a@example.com" }), undefined);
    assert.ok(blocked(attempt(login, "203.0.113.3", { email: "a@example.com" })));
  });

  test("every email is counted the same way, whether or not an account exists", () => {
    // The limiter never looks accounts up, so a registered and an unknown address behave identically.
    const outcomes = (email: string, ip: string) =>
      Array.from({ length: 4 }, () => (blocked(attempt(login, ip, { email })) ? "blocked" : "allowed"));
    assert.deepEqual(outcomes("registered@example.com", "203.0.113.4"), outcomes("nobody@example.com", "203.0.113.5"));
  });

  test("the per-email counter spans IPs, so a distributed attack on one account is throttled", () => {
    for (let index = 0; index < 5; index += 1) assert.equal(attempt(login, `198.51.100.${index}`, { email: "victim@example.com" }), undefined);
    assert.ok(blocked(attempt(login, "198.51.100.200", { email: "victim@example.com" })));
    assert.equal(attempt(login, "198.51.100.200", { email: "someone-else@example.com" }), undefined, "other accounts unaffected");
  });

  test("addresses in the same IPv6 /64 share one per-IP counter", () => {
    for (let index = 1; index <= 8; index += 1) {
      assert.equal(attempt(login, `2001:db8:abcd:12::${index.toString(16)}`, { email: `u${index}@example.com` }), undefined);
    }
    assert.ok(blocked(attempt(login, "2001:db8:abcd:12:ffff::1", { email: "u9@example.com" })), "same /64");
    assert.equal(attempt(login, "2001:db8:abcd:13::1", { email: "u9@example.com" }), undefined, "next /64");
  });

  test("rotating emails cannot evict the per-IP counter (separate bounded stores)", () => {
    for (let index = 0; index < 7; index += 1) attempt(login, "203.0.113.6", { email: `seed${index}@example.com` });
    // 200 more distinct emails (from one other IP) overflow the 50-key email and pair stores...
    for (let index = 0; index < 200; index += 1) attempt(login, "192.0.2.1", { email: `rotate${index}@example.com` }, 400);
    // ...but the per-IP counter for 203.0.113.6 is still there: one more failure fits, then it blocks.
    assert.equal(attempt(login, "203.0.113.6", { email: "last@example.com" }), undefined);
    assert.ok(blocked(attempt(login, "203.0.113.6", { email: "after@example.com" })));
  });

  test("blocked attempts are logged with masked identifiers and counted in the metric", () => {
    for (let index = 0; index < 3; index += 1) attempt(login, "203.0.113.7", { email: "jordan@example.com", password: "hunter2" });
    attempt(login, "203.0.113.7", { email: "jordan@example.com", password: "hunter2" });

    const entry = logs.map((line) => JSON.parse(line)).find((line) => line.event === "auth_rate_limited");
    assert.equal(entry.route, "login");
    assert.equal(entry.limiter, "login_pair");
    assert.equal(entry.retryAfterSeconds, 600);
    assert.equal(entry.identifier, "203.0.113.x|j***@e***.com");
    const raw = logs.join("\n");
    for (const secret of ["jordan@example.com", "hunter2", "203.0.113.7"]) assert.ok(!raw.includes(secret), `log leaked ${secret}`);
    assert.match(metricsText(), /auth_rate_limited_total\{limiter="login_pair",route="login"\} \d+/);
  });
});

describe("password-reset limiter", () => {
  test("caps each address per hour and per UTC day", () => {
    for (let index = 0; index < 2; index += 1) assert.equal(attempt(reset, "203.0.113.20", { email: "a@example.com" }), undefined);
    assert.ok(blocked(attempt(reset, "203.0.113.20", { email: "a@example.com" })), "hourly per-email cap");

    mock.timers.tick(60 * 60_000);
    assert.equal(attempt(reset, "203.0.113.20", { email: "a@example.com" }), undefined, "third of the day");
    const error = attempt(reset, "203.0.113.20", { email: "a@example.com" });
    assert.ok(blocked(error), "daily per-email cap");
    // 13:00 UTC now, so the daily window ends in 11 hours.
    assert.equal((error as InstanceType<typeof AppError>).retryAfterSeconds, 11 * 3600);
  });

  test("the daily total blocks everyone until UTC midnight, then reopens", () => {
    for (let index = 0; index < 6; index += 1) assert.equal(attempt(reset, `203.0.113.${30 + index}`, { email: `u${index}@example.com` }), undefined);
    const error = attempt(reset, "203.0.113.99", { email: "new@example.com" });
    assert.ok(blocked(error));
    assert.equal((error as InstanceType<typeof AppError>).retryAfterSeconds, 12 * 3600);

    mock.timers.tick(12 * 3600_000);
    assert.equal(attempt(reset, "203.0.113.99", { email: "new@example.com" }), undefined, "new UTC day");
  });
});
