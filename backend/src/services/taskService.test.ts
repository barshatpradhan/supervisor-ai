import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { supabase } from "../config/supabase.js";
import { createTask, listTasks } from "./taskService.js";

interface ListedTask {
  id: string;
  progress_history: unknown[];
}

test("listTasks returns every task with its own progress_history array", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `task-list-test-${suffix}@example.test`;

  const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
    email,
    password: `TestPassword-${suffix}!`,
    email_confirm: true,
  });
  assert.equal(authUserError, null, authUserError?.message);
  assert.ok(authUser.user);
  const authUserId = authUser.user.id;

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ auth_user_id: authUserId, email })
    .select("id")
    .single<{ id: string }>();
  assert.equal(userError, null, userError?.message);
  assert.ok(user);

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name: `Task list test org ${suffix}`,
      slug: `task-list-test-${suffix}`,
      created_by_user_id: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  assert.equal(organizationError, null, organizationError?.message);
  assert.ok(organization);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      title: `Task list test project ${suffix}`,
      organization_id: organization.id,
      created_by_user_id: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  assert.equal(projectError, null, projectError?.message);
  assert.ok(project);

  try {
    const firstTask = await createTask(authUserId, organization.id, {
      projectId: project.id,
      title: "First verification task",
    });
    const secondTask = await createTask(authUserId, organization.id, {
      projectId: project.id,
      title: "Second verification task",
    });

    const tasks = (await listTasks(authUserId, organization.id, "supervisor")) as ListedTask[];

    assert.ok(Array.isArray(tasks), "listTasks should resolve an array of tasks, not a single merged object");
    assert.equal(tasks.length, 2, "both created tasks should be present in the list");

    for (const createdTask of [firstTask, secondTask]) {
      const listedTask = tasks.find((task) => task.id === createdTask.id);
      assert.ok(listedTask, `created task ${createdTask.id} should be present in the list`);
      assert.ok(
        Array.isArray(listedTask.progress_history),
        `task ${createdTask.id} should include its own progress_history array`
      );
      assert.deepEqual(listedTask.progress_history, []);
    }
  } finally {
    await supabase.from("tasks").delete().eq("project_id", project.id);
    await supabase.from("projects").delete().eq("id", project.id);
    await supabase.from("organizations").delete().eq("id", organization.id);
    await supabase.from("users").delete().eq("id", user.id);
    await supabase.auth.admin.deleteUser(authUserId);
  }
});
