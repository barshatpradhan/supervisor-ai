import assert from "node:assert/strict";
import test from "node:test";
import { projectProgressFromHours, statusForProgress } from "./taskProgressMetrics.js";

test("employee progress statuses and duplicate completion preserve completion semantics", () => {
  assert.equal(statusForProgress(0), "todo");
  assert.equal(statusForProgress(65), "in_progress");
  assert.equal(statusForProgress(100), "completed");
  assert.equal(statusForProgress(100), "completed");
});

test("project progress is estimated-hours weighted and clamped", () => {
  assert.equal(projectProgressFromHours([{ status: "completed", estimatedHours: 8 }, { status: "todo", estimatedHours: 2 }]), 80);
  assert.equal(projectProgressFromHours([], ), 0);
});
