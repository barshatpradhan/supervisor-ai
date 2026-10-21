import assert from "node:assert/strict";
import test from "node:test";
import { nextAssignedAt } from "./taskAssignmentRules.js";

const now = new Date("2026-10-22T12:00:00.000Z");
const assigned = { assigned_employee_id: "emp-a", assigned_at: "2026-01-05T09:00:00.000Z" };

test("re-saving the same assignee keeps the original assigned_at", () => {
  assert.equal(nextAssignedAt(assigned, "emp-a", now), "2026-01-05T09:00:00.000Z");
});

test("a different assignee gets a fresh assigned_at", () => {
  assert.equal(nextAssignedAt(assigned, "emp-b", now), now.toISOString());
  assert.equal(nextAssignedAt({ assigned_employee_id: null, assigned_at: null }, "emp-a", now), now.toISOString());
});

test("unassigning clears assigned_at", () => {
  assert.equal(nextAssignedAt(assigned, null, now), null);
});

test("the same assignee with no recorded assigned_at gets one", () => {
  assert.equal(nextAssignedAt({ assigned_employee_id: "emp-a", assigned_at: null }, "emp-a", now), now.toISOString());
});
