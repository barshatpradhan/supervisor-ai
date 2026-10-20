import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSkillInput, looksLikeSkillName, skillMatchKey, tidySkillName } from "./skillNames.js";

test("skillMatchKey merges spelling variants", () => {
  assert.equal(skillMatchKey("Node.js"), skillMatchKey("node js"));
  assert.equal(skillMatchKey("NodeJS"), "nodejs");
  assert.equal(skillMatchKey("Next. Js"), skillMatchKey("Next.js"));
  assert.equal(skillMatchKey("CI/CD"), "cicd");
});

test("skillMatchKey keeps C, C# and C++ apart", () => {
  const keys = new Set(["C", "C#", "C++"].map(skillMatchKey));
  assert.equal(keys.size, 3);
});

test("tidySkillName capitalises lowercase words and keeps mixed case", () => {
  assert.equal(tidySkillName("  kubernetes   operators "), "Kubernetes Operators");
  assert.equal(tidySkillName("iOS widgets"), "iOS Widgets");
  assert.equal(cleanSkillInput("- GraphQL, "), "GraphQL");
});

test("looksLikeSkillName rejects obvious junk", () => {
  assert.equal(looksLikeSkillName("asdfghjkl"), false);
  assert.equal(looksLikeSkillName("aaaa"), false);
  assert.equal(looksLikeSkillName("12345"), false);
  assert.equal(looksLikeSkillName("C++"), true);
  assert.equal(looksLikeSkillName("Rust"), true);
});
