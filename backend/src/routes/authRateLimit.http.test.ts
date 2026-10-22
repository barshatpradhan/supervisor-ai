/**
 * HTTP-level tests: the real Express app (app.ts) on a random local port, real routes, real
 * validation and controllers. Only Supabase Auth's signInWithPassword and resetPasswordForEmail
 * are stubbed. SUPABASE_URL points at a dead local address and global fetch is replaced, so
 * nothing can reach real Supabase, use real credentials or touch a configured database.
 */
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";

// Fake, non-secret configuration. Set before the app loads; dotenv never overrides these.
Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-key",
  TRANSACTIONAL_EMAIL_PROVIDER: "console",
  CORS_ORIGINS: "http://app.test",
  FRONTEND_APP_URL: "http://app.test",
  TRUST_PROXY_HOPS: "1",
  RATE_LIMIT_MAX: "1000",
  AUTH_RL_LOGIN_IP_MAX: "50",
  AUTH_RL_LOGIN_EMAIL_MAX: "50",
  AUTH_RL_LOGIN_PAIR_MAX: "3",
  AUTH_RL_RESET_IP_MAX: "50",
  AUTH_RL_RESET_EMAIL_MAX: "2",
  AUTH_RL_RESET_DAILY_TOTAL_MAX: "5",
  AUTH_RL_INVITATION_INSPECT_IP_MAX: "3",
});

// Every outbound request fails at once and is recorded; only calls to this test's server pass.
const realFetch = globalThis.fetch;
const outbound: string[] = [];
let serverOrigin = "";
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (serverOrigin && url.startsWith(serverOrigin)) return realFetch(input, init);
  outbound.push(url);
  throw new TypeError("Network access is blocked in tests.");
}) as typeof fetch;

const { supabaseAuth } = await import("../config/supabase.js");
const { default: app } = await import("../app.js");
const { AUTH_RATE_LIMIT_MESSAGE, resetAuthRateLimits } = await import("../middleware/authRateLimiter.js");

const auth = supabaseAuth.auth as unknown as Record<string, unknown>;
const invalidCredentials = () => ({
  data: { user: null, session: null },
  error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
});
let signIn: () => unknown = invalidCredentials;
auth.signInWithPassword = async () => signIn();
auth.resetPasswordForEmail = async () => ({ data: {}, error: null });

let server: ReturnType<typeof app.listen>;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  serverOrigin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.close();
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  resetAuthRateLimits();
  signIn = invalidCredentials;
});

async function call(method: string, path: string, clientIp: string, body?: unknown) {
  const response = await fetch(`${serverOrigin}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: "http://app.test", "X-Forwarded-For": clientIp },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, body: (await response.json()) as Record<string, unknown> };
}

const loginAs = (ip: string, email: string) => call("POST", "/api/v1/auth/login", ip, { email, password: "wrong-password" });

function assertGeneric429(response: Awaited<ReturnType<typeof call>>, retryAfter?: number) {
  assert.equal(response.status, 429);
  assert.deepEqual(response.body, { success: false, message: AUTH_RATE_LIMIT_MESSAGE, error: AUTH_RATE_LIMIT_MESSAGE });
  const header = Number(response.headers.get("retry-after"));
  assert.ok(header >= 1, "Retry-After present");
  if (retryAfter !== undefined) assert.equal(header, retryAfter);
  assert.match(response.headers.get("access-control-expose-headers") ?? "", /Retry-After/i, "readable by the browser");
}

describe("POST /api/v1/auth/login", () => {
  test("wrong passwords answer 401 until the pair limit, then a generic 429 with Retry-After", async () => {
    for (let index = 0; index < 3; index += 1) {
      const response = await loginAs("203.0.113.10", "a@example.com");
      assert.equal(response.status, 401);
      assert.equal(response.body.message, "Invalid email or password.");
      assert.ok(response.headers.get("ratelimit-limit"), "the global limiter still runs");
    }
    assertGeneric429(await loginAs("203.0.113.10", "a@example.com"), 600);
  });

  test("registered and unknown emails get byte-identical responses, before and after the limit", async () => {
    // Supabase answers the same for both (it never says which part was wrong).
    const run = async (ip: string, email: string) => {
      const responses = [];
      for (let index = 0; index < 4; index += 1) {
        const response = await loginAs(ip, email);
        responses.push({ status: response.status, body: response.body, retryAfter: response.headers.get("retry-after") });
      }
      return responses;
    };
    assert.deepEqual(await run("203.0.113.11", "registered@example.com"), await run("203.0.113.12", "nobody@example.com"));
  });

  test("a Supabase sign-in rate limit becomes the same generic 429 and is not counted as a failure", async () => {
    signIn = () => ({ data: { user: null, session: null }, error: new AuthApiError("Request rate limit reached", 429, "over_request_rate_limit") });
    for (let index = 0; index < 5; index += 1) assertGeneric429(await loginAs("203.0.113.13", "a@example.com"), 60);

    signIn = invalidCredentials;
    for (let index = 0; index < 3; index += 1) {
      assert.equal((await loginAs("203.0.113.13", "a@example.com")).status, 401, "upstream 429s did not use up the pair limit");
    }
  });

  test("an unreachable auth service answers 503 and is not counted", async () => {
    signIn = () => ({ data: { user: null, session: null }, error: new AuthRetryableFetchError("fetch failed", 0) });
    for (let index = 0; index < 5; index += 1) assert.equal((await loginAs("203.0.113.14", "a@example.com")).status, 503);
    signIn = invalidCredentials;
    assert.equal((await loginAs("203.0.113.14", "a@example.com")).status, 401);
  });

  test("with TRUST_PROXY_HOPS=1, spoofed X-Forwarded-For entries cannot change the client IP", async () => {
    // The proxy appends the real client IP last; anything the client put before it is ignored.
    for (const spoofed of ["6.6.6.6", "7.7.7.7", "8.8.8.8"]) {
      assert.equal((await loginAs(`${spoofed}, 203.0.113.15`, "a@example.com")).status, 401);
    }
    assertGeneric429(await loginAs("9.9.9.9, 203.0.113.15", "a@example.com"));
    assert.equal((await loginAs("203.0.113.16", "a@example.com")).status, 401, "a genuinely different client is unaffected");
  });
});

describe("POST /api/v1/auth/password-reset", () => {
  test("limits each address and the daily total, with the same generic 429", async () => {
    const resetFor = (ip: string, email: string) => call("POST", "/api/v1/auth/password-reset", ip, { email });
    assert.equal((await resetFor("203.0.113.20", "a@example.com")).status, 200);
    assert.equal((await resetFor("203.0.113.20", "a@example.com")).status, 200);
    assertGeneric429(await resetFor("203.0.113.20", "a@example.com"));

    for (const email of ["b@example.com", "c@example.com", "d@example.com"]) {
      assert.equal((await resetFor("203.0.113.21", email)).status, 200);
    }
    const capped = await resetFor("203.0.113.22", "e@example.com");
    assertGeneric429(capped);
    assert.ok(Number(capped.headers.get("retry-after")) <= 24 * 3600, "until the next UTC midnight");
  });
});

describe("GET /api/v1/invitations/:token", () => {
  test("limits token lookups per IP", async () => {
    for (let index = 0; index < 3; index += 1) {
      const response = await call("GET", `/api/v1/invitations/guess-${index}`, "203.0.113.30");
      assert.notEqual(response.status, 429);
    }
    assertGeneric429(await call("GET", "/api/v1/invitations/guess-4", "203.0.113.30"));
  });
});

describe("safety", () => {
  test("blocked attempts are visible in the metrics", async () => {
    for (let index = 0; index < 4; index += 1) await loginAs("203.0.113.40", "m@example.com");
    const metrics = await (await fetch(`${serverOrigin}/metrics`)).text();
    assert.match(metrics, /auth_rate_limited_total\{limiter="login_pair",route="login"\} \d+/);
  });

  test("no request ever left the machine", () => {
    for (const url of outbound) assert.ok(url.startsWith("http://127.0.0.1:9/"), `unexpected outbound request to ${url}`);
  });
});
