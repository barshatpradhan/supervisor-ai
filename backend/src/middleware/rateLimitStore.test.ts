import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemoryRateLimitStore } from "./rateLimitStore.js";

describe("MemoryRateLimitStore", () => {
  test("counts hits inside a fixed window and starts again after it", () => {
    const store = new MemoryRateLimitStore({ maxKeys: 10 });
    assert.deepEqual(store.hit("a", 1_000, 0), { count: 1, resetAt: 1_000 });
    assert.deepEqual(store.hit("a", 1_000, 999), { count: 2, resetAt: 1_000 });
    assert.deepEqual(store.hit("a", 1_000, 1_000), { count: 1, resetAt: 2_000 }, "window boundary starts a new window");
    store.reset();
  });

  test("peek reads without counting and ignores expired windows; clear forgets a key", () => {
    const store = new MemoryRateLimitStore({ maxKeys: 10 });
    store.hit("a", 1_000, 0);
    assert.deepEqual(store.peek("a", 500), { count: 1, resetAt: 1_000 });
    assert.equal(store.peek("a", 1_000), null);
    assert.equal(store.peek("missing", 0), null);
    store.clear("a");
    assert.equal(store.peek("a", 0), null);
    store.reset();
  });

  test("never holds more than maxKeys; a new key evicts the oldest window", () => {
    const store = new MemoryRateLimitStore({ maxKeys: 3 });
    store.hit("a", 10_000, 0);
    store.hit("b", 10_000, 1);
    store.hit("c", 10_000, 2);
    store.hit("a", 10_000, 3); // existing key: counted, nothing evicted
    assert.equal(store.size, 3);

    store.hit("d", 10_000, 4);
    assert.equal(store.size, 3);
    assert.equal(store.peek("a", 5), null, "the oldest window is evicted, even if it was hit again");
    assert.ok(store.peek("b", 5) && store.peek("c", 5) && store.peek("d", 5));
    store.reset();
  });

  test("an attacker rotating keys cannot grow the store", () => {
    const store = new MemoryRateLimitStore({ maxKeys: 1_000 });
    for (let index = 0; index < 100_000; index += 1) store.hit(`rotating-${index}`, 60_000, index);
    assert.equal(store.size, 1_000);
    store.reset();
  });

  test("sweep removes only expired windows", () => {
    const store = new MemoryRateLimitStore({ maxKeys: 10 });
    store.hit("short", 100, 0);
    store.hit("long", 10_000, 0);
    store.sweep(100);
    assert.equal(store.size, 1);
    assert.ok(store.peek("long", 100));
    store.reset();
  });

  test("creating a store starts no timer; the sweep timer starts on the first hit and is unref'd", () => {
    const before = process.getActiveResourcesInfo().filter((name) => name === "Timeout").length;
    const store = new MemoryRateLimitStore({ maxKeys: 10, sweepIntervalMs: 50 });
    assert.equal(process.getActiveResourcesInfo().filter((name) => name === "Timeout").length, before);
    store.hit("a", 1_000);
    store.reset();
  });

  test("rejects an invalid key cap", () => {
    assert.throws(() => new MemoryRateLimitStore({ maxKeys: 0 }));
  });
});
