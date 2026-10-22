import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-key",
  TRANSACTIONAL_EMAIL_PROVIDER: "console",
});

const { supabase } = await import("../config/supabase.js");
const { AVATAR_LOOKUP_CHUNK, avatarFor, getAvatarVariants } = await import("./avatarService.js");

const stored = new Map<string, string | null>();
const queries: Array<{ table: string; columns: string; ids: string[] }> = [];
let failWith: string | null = null;

(supabase as unknown as { from: unknown }).from = (table: string) => {
  const query = { table, columns: "", ids: [] as string[] };
  const builder = {
    select(columns: string) { query.columns = columns; return builder; },
    in(_column: string, ids: string[]) { query.ids = ids; return builder; },
    async returns() {
      queries.push(query);
      if (failWith) return { data: null, error: { message: failWith } };
      return { data: query.ids.filter((id) => stored.has(id)).map((id) => ({ id, avatar_variant: stored.get(id) ?? null })), error: null };
    },
  };
  return builder;
};

beforeEach(() => {
  stored.clear();
  queries.length = 0;
  failWith = null;
});

describe("getAvatarVariants", () => {
  test("one query for the unique ids, selecting only id and avatar_variant", async () => {
    stored.set("u1", "p03-s4-c2-a1");
    stored.set("u2", null);
    const result = await getAvatarVariants(["u1", "u2", "u1", null, undefined, ""]);
    assert.deepEqual([...result], [["u1", "p03-s4-c2-a1"], ["u2", null]]);
    assert.deepEqual(queries, [{ table: "users", columns: "id, avatar_variant", ids: ["u1", "u2"] }]);
  });

  test("no query for an empty list", async () => {
    assert.equal((await getAvatarVariants([])).size, 0);
    assert.equal((await getAvatarVariants([null, ""])).size, 0);
    assert.equal(queries.length, 0);
  });

  test("missing users and stored values that are no longer valid read as null", async () => {
    stored.set("old", "future-format-2");
    stored.set("ears", "p03-s4-c2-a3");
    const result = await getAvatarVariants(["old", "ears", "ghost"]);
    assert.deepEqual([...result], [["old", null], ["ears", null], ["ghost", null]]);
  });

  test(`lists above ${AVATAR_LOOKUP_CHUNK} ids are split into chunks`, async () => {
    const ids = Array.from({ length: AVATAR_LOOKUP_CHUNK * 2 + 1 }, (_, index) => `u${index}`);
    stored.set("u0", "p01-s1-c1-a0");
    stored.set(`u${AVATAR_LOOKUP_CHUNK * 2}`, "p12-s6-c6-a3");
    const result = await getAvatarVariants(ids);
    assert.deepEqual(queries.map((query) => query.ids.length), [AVATAR_LOOKUP_CHUNK, AVATAR_LOOKUP_CHUNK, 1]);
    assert.equal(result.size, ids.length);
    assert.equal(result.get(`u${AVATAR_LOOKUP_CHUNK * 2}`), "p12-s6-c6-a3");
    assert.equal(avatarFor(result, "u0"), "p01-s1-c1-a0");
  });

  test("a failed lookup degrades to initials instead of failing the request", async () => {
    failWith = "connection reset";
    const result = await getAvatarVariants(["u1"]);
    assert.deepEqual([...result], [["u1", null]]);
  });

  test("avatarFor handles absent people", () => {
    const variants = new Map([["u1", "p01-s1-c1-a0"]]);
    assert.equal(avatarFor(variants, "u1"), "p01-s1-c1-a0");
    assert.equal(avatarFor(variants, "u2"), null);
    assert.equal(avatarFor(variants, null), null);
  });
});
