/**
 * PATCH /api/v1/auth/me/avatar through the real app. Supabase is replaced at the client level:
 * auth.getUser maps test tokens to users, and the "users" table is an in-memory fake that records
 * every filter, so the tests can prove which row an update touched. Outbound network is blocked.
 */
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-key",
  TRANSACTIONAL_EMAIL_PROVIDER: "console",
  CORS_ORIGINS: "http://app.test",
  FRONTEND_APP_URL: "http://app.test",
  RATE_LIMIT_MAX: "1000",
  // Every request that reaches the limiter counts, including ones that then fail validation.
  AUTH_RL_AVATAR_UPDATE_MAX: "10",
});

const realFetch = globalThis.fetch;
let serverOrigin = "";
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (serverOrigin && url.startsWith(serverOrigin)) return realFetch(input, init);
  throw new TypeError(`Network access is blocked in tests: ${url}`);
}) as typeof fetch;

const { supabase } = await import("../config/supabase.js");
const { default: app } = await import("../app.js");

interface UserRow { id: string; auth_user_id: string; email: string; role: null; platform_role: null; avatar_variant: string | null }
const users: UserRow[] = [];
const updates: Array<{ filters: Record<string, unknown>; values: Record<string, unknown> }> = [];

/** A tiny stand-in for supabase.from("users") covering the calls the avatar flow makes. */
function fakeUsersTable() {
  const filters: Record<string, unknown> = {};
  let values: Record<string, unknown> | null = null;
  const builder = {
    select: () => builder,
    update: (next: Record<string, unknown>) => { values = next; return builder; },
    eq: (column: string, value: unknown) => { filters[column] = value; return builder; },
    single: async () => {
      const row = users.find((user) => Object.entries(filters).every(([column, value]) => user[column as keyof UserRow] === value));
      if (!row) return { data: null, error: { message: "not found" } };
      if (values) {
        updates.push({ filters: { ...filters }, values: { ...values } });
        Object.assign(row, values);
      }
      return { data: { ...row }, error: null };
    },
  };
  return builder;
}

const client = supabase as unknown as Record<string, unknown> & { auth: Record<string, unknown> };
client.from = (table: string) => {
  if (table !== "users") throw new Error(`unexpected table ${table}`);
  return fakeUsersTable();
};
client.auth.getUser = async (token: string) => {
  const user = { "token-ann": { id: "auth-ann" }, "token-bob": { id: "auth-bob" } }[token];
  return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "invalid" } };
};

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
  users.splice(0, users.length,
    { id: "app-ann", auth_user_id: "auth-ann", email: "ann@x.test", role: null, platform_role: null, avatar_variant: null },
    { id: "app-bob", auth_user_id: "auth-bob", email: "bob@x.test", role: null, platform_role: null, avatar_variant: "p05-s5-c4-a2" },
  );
  updates.length = 0;
});

async function patch(token: string | null, body: unknown, ip = "203.0.113.1") {
  const response = await fetch(`${serverOrigin}/api/v1/auth/me/avatar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, body: (await response.json()) as Record<string, unknown> };
}

describe("PATCH /api/v1/auth/me/avatar", () => {
  test("sets the caller's avatar and returns it", async () => {
    const response = await patch("token-ann", { variant: "p03-s4-c2-a1" });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, { avatarVariant: "p03-s4-c2-a1" });
    assert.equal(users[0].avatar_variant, "p03-s4-c2-a1");
  });

  test("only ever updates the caller's own row, whatever the body says", async () => {
    const response = await patch("token-ann", { variant: "p01-s1-c1-a0", userId: "app-bob", id: "app-bob", auth_user_id: "auth-bob" });
    assert.equal(response.status, 200);
    assert.deepEqual(updates, [{ filters: { id: "app-ann" }, values: { avatar_variant: "p01-s1-c1-a0" } }]);
    assert.equal(users[1].avatar_variant, "p05-s5-c4-a2", "Bob's avatar is untouched");
  });

  test("null goes back to initials", async () => {
    users[0].avatar_variant = "p03-s4-c2-a1";
    const response = await patch("token-ann", { variant: null });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, { avatarVariant: null });
  });

  test("rejects invalid IDs, a missing variant and unauthenticated calls without writing", async () => {
    for (const body of [{ variant: "p13-s1-c1-a0" }, { variant: "<svg onload=x>" }, { variant: "p03-s4-c2-a3" }, {}, { variant: 7 }]) {
      assert.equal((await patch("token-ann", body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await patch(null, { variant: "p01-s1-c1-a0" })).status, 401);
    assert.equal((await patch("forged-token", { variant: "p01-s1-c1-a0" })).status, 401);
    assert.equal(updates.length, 0);
  });

  test("is rate limited per user, not per IP", async () => {
    // Earlier tests used 8 of Ann's 10; Bob starts fresh, and each request comes from a different IP.
    for (let index = 0; index < 10; index += 1) {
      assert.equal((await patch("token-bob", { variant: "p02-s3-c3-a3" }, `198.51.100.${index}`)).status, 200);
    }
    const limited = await patch("token-bob", { variant: "p02-s3-c3-a3" }, "198.51.100.99");
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
  });
});
