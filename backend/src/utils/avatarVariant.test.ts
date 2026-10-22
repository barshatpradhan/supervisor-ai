import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { AppError } from "./appError.js";
import { AVATAR_ID_PATTERN, isValidAvatarVariant, parseAvatarVariantInput, readStoredAvatarVariant } from "./avatarVariant.js";

describe("avatar variant format", () => {
  test("accepts every preset, skin, colour and accessory in range", () => {
    for (const id of ["p01-s1-c1-a0", "p12-s6-c6-a3", "p09-s4-c2-a1", "p05-s5-c4-a2"]) {
      assert.equal(isValidAvatarVariant(id), true, id);
    }
  });

  test("rejects anything outside the format", () => {
    for (const value of ["", "p00-s1-c1-a0", "p13-s1-c1-a0", "p1-s1-c1-a0", "p01-s0-c1-a0", "p01-s7-c1-a0", "p01-s1-c7-a0", "p01-s1-c1-a4", "P01-S1-C1-A0", " p01-s1-c1-a0", "p01-s1-c1-a0 ", "<svg/>", 42, null, undefined, {}]) {
      assert.equal(isValidAvatarVariant(value), false, String(value));
    }
  });

  test("earrings are not allowed with the hijab preset, which covers the ears", () => {
    assert.equal(isValidAvatarVariant("p03-s4-c2-a3"), false);
    assert.equal(isValidAvatarVariant("p03-s4-c2-a1"), true);
  });

  test("request input: a valid ID or null; anything else is a 400", () => {
    assert.equal(parseAvatarVariantInput("p03-s4-c2-a1"), "p03-s4-c2-a1");
    assert.equal(parseAvatarVariantInput(null), null);
    for (const value of [undefined, "", "nope", 7]) {
      assert.throws(() => parseAvatarVariantInput(value), (error: unknown) => error instanceof AppError && error.statusCode === 400);
    }
  });

  test("stored values that are no longer valid read as null (initials)", () => {
    assert.equal(readStoredAvatarVariant("p03-s4-c2-a1"), "p03-s4-c2-a1");
    assert.equal(readStoredAvatarVariant("future-format-2"), null);
    assert.equal(readStoredAvatarVariant(null), null);
  });

  test("the backend and frontend patterns are identical (drift check)", async () => {
    const corePath = fileURLToPath(new URL("../../../frontend/src/components/ui/avatar/avatar-core.ts", import.meta.url));
    const source = await readFile(corePath, "utf8");
    const match = /export const AVATAR_ID_PATTERN = (\/.+\/[a-z]*);/.exec(source);
    assert.ok(match, "AVATAR_ID_PATTERN not found in the frontend avatar core");
    assert.equal(match[1], String(AVATAR_ID_PATTERN));
  });
});
