/**
 * Characterization tests for createTaskProgress: they pin down what the task service does TODAY
 * (status transitions, completed_at, activity entries, project progress), including quirks, so
 * that moving the inline rules onto taskProgressMetrics.ts (cleanup batch G) can be shown to change
 * nothing. Each case also checks that taskProgressMetrics.ts gives the same answer.
 *
 * They write real rows, so they only run against a disposable local database:
 *   npm run test:integration
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { requireDisposableDatabase } from "../testing/requireDisposableDatabase.js";

requireDisposableDatabase("taskProgress.characterization.test.ts");

const { supabase } = await import("../config/supabase.js");
const { createTaskProgress } = await import("./taskService.js");
const { projectProgressFromHours, statusForProgress } = await import("./taskProgressMetrics.js");
const { AppError } = await import("../utils/appError.js");

const suffix = crypto.randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
let organizationId: string;
let creatorUserId: string;

interface Person {
  appUserId: string;
  authUserId: string;
  employeeId?: string;
}

interface TaskRow {
  status: string;
  completed_at: string | null;
}

async function insert<T>(table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single<T>();
  assert.equal(error, null, `${table}: ${error?.message}`);
  return data as T;
}

async function person(label: string, withEmployee: boolean): Promise<Person> {
  const authUserId = crypto.randomUUID();
  const user = await insert<{ id: string }>("users", {
    auth_user_id: authUserId,
    email: `progress-${label}-${suffix}@example.test`,
  });
  createdUserIds.push(user.id);
  if (!withEmployee) return { appUserId: user.id, authUserId };
  const employee = await insert<{ id: string }>("employees", {
    user_id: user.id,
    organization_id: organizationId,
    full_name: `Progress ${label} ${suffix}`,
  });
  return { appUserId: user.id, authUserId, employeeId: employee.id };
}

async function project(title: string) {
  return (await insert<{ id: string }>("projects", {
    title: `${title} ${suffix}`,
    organization_id: organizationId,
    created_by_user_id: creatorUserId,
  })).id;
}

async function task(projectId: string, options: { assignee?: Person; hours?: number; status?: string; deleted?: boolean } = {}) {
  return (await insert<{ id: string }>("tasks", {
    project_id: projectId,
    title: `Task ${crypto.randomUUID().slice(0, 6)}`,
    created_by_user_id: creatorUserId,
    assigned_employee_id: options.assignee?.employeeId ?? null,
    assigned_at: options.assignee ? new Date().toISOString() : null,
    estimated_hours: options.hours ?? 1,
    status: options.status ?? "todo",
    completed_at: options.status === "completed" ? new Date().toISOString() : null,
    deleted_at: options.deleted ? new Date().toISOString() : null,
  })).id;
}

async function readTask(taskId: string) {
  const { data, error } = await supabase.from("tasks").select("status, completed_at").eq("id", taskId).single<TaskRow>();
  assert.equal(error, null, error?.message);
  return data as TaskRow;
}

async function activityCount(taskId: string, eventType: string) {
  const { count, error } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("event_type", eventType);
  assert.equal(error, null, error?.message);
  return count ?? 0;
}

const report = (actor: Person, taskId: string, progressPercentage: number, extra: { status?: "todo" | "in_progress" | "review" | "blocked" | "completed" | "cancelled"; notes?: string } = {}, role: "employee" | "supervisor" | "organization_admin" = "employee") =>
  createTaskProgress(actor.authUserId, organizationId, taskId, { progressPercentage, ...extra }, role);

const pause = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

let ana: Person;
let ben: Person;
let sam: Person;

before(async () => {
  const creatorAuth = crypto.randomUUID();
  const creator = await insert<{ id: string }>("users", { auth_user_id: creatorAuth, email: `progress-owner-${suffix}@example.test` });
  createdUserIds.push(creator.id);
  creatorUserId = creator.id;
  organizationId = (await insert<{ id: string }>("organizations", {
    name: `Progress ${suffix}`,
    slug: `progress-${suffix}`,
    created_by_user_id: creatorUserId,
  })).id;

  ana = await person("ana", true);
  ben = await person("ben", true);
  sam = await person("sam", false); // a supervisor: no employee profile
});

after(async () => {
  await supabase.from("organizations").delete().eq("id", organizationId);
  if (createdUserIds.length) await supabase.from("users").delete().in("id", createdUserIds);
});

describe("task status after a progress report", () => {
  test("without an explicit status, 0% is todo, 1-99% in_progress and 100% completed", async () => {
    const projectId = await project("Status");
    for (const [percent, expected] of [[0, "todo"], [1, "in_progress"], [40, "in_progress"], [99, "in_progress"], [100, "completed"]] as const) {
      const taskId = await task(projectId, { assignee: ana });
      const result = await report(ana, taskId, percent);
      assert.equal(result.task.status, expected, `${percent}%`);
      assert.equal(statusForProgress(percent), expected, "taskProgressMetrics agrees");
      assert.equal((await readTask(taskId)).completed_at !== null, expected === "completed");
      assert.equal(result.progress.status, null, "the progress row never stores a status");
      assert.equal(result.progress.progress_percentage, percent);
    }
  });

  test("an explicit status wins over the percentage, even 'completed' at 40%", async () => {
    const projectId = await project("Explicit");
    const blocked = await task(projectId, { assignee: ana });
    assert.equal((await report(ana, blocked, 40, { status: "blocked" })).task.status, "blocked");

    const forced = await task(projectId, { assignee: ana });
    const result = await report(ana, forced, 40, { status: "completed" });
    assert.equal(result.task.status, "completed");
    assert.ok((await readTask(forced)).completed_at, "completed_at is set even though progress is 40%");
  });

  test("completing twice keeps the first completed_at and logs task_completed once", async () => {
    const projectId = await project("Twice");
    const taskId = await task(projectId, { assignee: ana });
    await report(ana, taskId, 100);
    const first = (await readTask(taskId)).completed_at;
    await pause();
    await report(ana, taskId, 100, { notes: "Really done" });

    assert.equal((await readTask(taskId)).completed_at, first);
    assert.equal(await activityCount(taskId, "task_completed"), 1);
    assert.equal(await activityCount(taskId, "task_progress_updated"), 2);
  });

  test("moving a completed task back to in progress keeps its completed_at (current quirk)", async () => {
    const projectId = await project("Reopen");
    const taskId = await task(projectId, { assignee: ana });
    await report(ana, taskId, 100);
    const completedAt = (await readTask(taskId)).completed_at;

    const result = await report(ana, taskId, 50);
    assert.equal(result.task.status, "in_progress");
    assert.equal((await readTask(taskId)).completed_at, completedAt);
  });
});

describe("who may report progress", () => {
  test("only the assigned employee; a supervisor reports on the assignee's behalf; unassigned tasks are refused", async () => {
    const projectId = await project("Who");
    const taskId = await task(projectId, { assignee: ana });

    await assert.rejects(report(ben, taskId, 10), (error: unknown) => error instanceof AppError && error.statusCode === 403);

    const bySupervisor = await report(sam, taskId, 30, {}, "supervisor");
    assert.equal(bySupervisor.progress.employee_id, ana.employeeId, "history is recorded under the assignee");
    assert.equal(bySupervisor.task.status, "in_progress");

    const unassigned = await task(projectId);
    await assert.rejects(report(sam, unassigned, 10, {}, "supervisor"), (error: unknown) => error instanceof AppError && error.statusCode === 400);
  });
});

describe("project progress", () => {
  test("is the estimated-hours share of completed live tasks; partial progress and deleted tasks don't count", async () => {
    const projectId = await project("Weighted");
    const big = await task(projectId, { assignee: ana, hours: 8 });
    const small = await task(projectId, { assignee: ana, hours: 2 });
    await task(projectId, { hours: 5, status: "completed", deleted: true });

    const afterPartial = await report(ana, small, 90);
    assert.equal(afterPartial.project_progress_percentage, 0);

    const afterBig = await report(ana, big, 100);
    assert.equal(afterBig.project_progress_percentage, 80);
    assert.equal(
      projectProgressFromHours([{ status: "completed", estimatedHours: 8 }, { status: "in_progress", estimatedHours: 2 }]),
      80,
      "taskProgressMetrics agrees"
    );

    const { data } = await supabase.from("projects").select("progress_percentage").eq("id", projectId).single<{ progress_percentage: number }>();
    assert.equal(Number(data?.progress_percentage), 80, "stored on the project");
  });

  test("rounds to two decimals", async () => {
    const projectId = await project("Rounding");
    const first = await task(projectId, { assignee: ana });
    await task(projectId, { assignee: ana });
    await task(projectId, { assignee: ana });

    const result = await report(ana, first, 100);
    assert.equal(result.project_progress_percentage, 33.33);
    assert.equal(
      projectProgressFromHours([
        { status: "completed", estimatedHours: 1 },
        { status: "todo", estimatedHours: 1 },
        { status: "todo", estimatedHours: 1 },
      ]),
      33.33
    );
  });
});
