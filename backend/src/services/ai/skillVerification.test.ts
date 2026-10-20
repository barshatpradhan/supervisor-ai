import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSkillVerdicts } from "./skillVerification.service.js";

const catalog = [
  { name: "React", category: "Frontend" },
  { name: "Kubernetes", category: "Cloud & DevOps" },
];

test("maps AI matches onto exact catalog names", () => {
  const verdicts = parseSkillVerdicts(
    [{ input: "reactjs", verdict: "match", catalogName: "react" }],
    ["reactjs"],
    catalog
  );
  assert.deepEqual(verdicts.get("reactjs"), { input: "reactjs", verdict: "match", catalogName: "React" });
});

test("drops matches to names that are not in the catalog", () => {
  const verdicts = parseSkillVerdicts([{ input: "vuejs", verdict: "match", catalogName: "Vue.js" }], ["vuejs"], catalog);
  assert.equal(verdicts.has("vuejs"), false);
});

test("treats a 'new' skill that already exists as a match", () => {
  const verdicts = parseSkillVerdicts([{ input: "k8", verdict: "new", name: "kubernetes", category: "Cloud & DevOps" }], ["k8"], catalog);
  assert.deepEqual(verdicts.get("k8"), { input: "k8", verdict: "match", catalogName: "Kubernetes" });
});

test("keeps new skills with a valid category and defaults unknown categories to Other", () => {
  const verdicts = parseSkillVerdicts(
    [
      { input: "kafka streams", verdict: "new", name: "Kafka Streams", category: "Backend" },
      { input: "zig", verdict: "new", name: "Zig", category: "Languages!!" },
    ],
    ["kafka streams", "zig"],
    catalog
  );
  assert.deepEqual(verdicts.get("kafka streams"), { input: "kafka streams", verdict: "new", name: "Kafka Streams", category: "Backend" });
  assert.equal((verdicts.get("zig") as { category: string }).category, "Other");
});

test("records invalid inputs with a reason and falls back to position for unknown echoes", () => {
  const verdicts = parseSkillVerdicts([{ input: "???", verdict: "invalid", reason: "Random letters" }], ["qwzx"], catalog);
  assert.deepEqual(verdicts.get("qwzx"), { input: "qwzx", verdict: "invalid", reason: "Random letters" });
});

test("ignores malformed output", () => {
  assert.equal(parseSkillVerdicts({ not: "an array" }, ["react"], catalog).size, 0);
  assert.equal(parseSkillVerdicts([{ input: "x", verdict: "new", name: "" }], ["x"], catalog).size, 0);
});
