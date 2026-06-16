import { supabase } from "../config/supabase.js";
import type { CreateTaskInput, CreateTaskProgressInput } from "../types/task.js";
import { AppError } from "../utils/appError.js";
import { assertRole, getAppUserByAuthId } from "./userService.js";

const ACTIVE_TASK_STATUSES = ["todo", "in_progress", "blocked", "review"];

const TASK_SELECT = `
  id,
  project_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  assigned_employee_id,
  created_by_user_id,
  assigned_at,
  completed_at,
  created_at,
  updated_at
`;

interface EmployeeCapacityRow {
  id: string;
  weekly_capacity_hours: number;
}

interface AssignedTaskHoursRow {
  estimated_hours: number;
}

async function getEmployeeForAuthUser(authUserId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      weekly_capacity_hours,
      users!inner (
        auth_user_id
      )
    `)
    .eq("users.auth_user_id", authUserId)
    .single<EmployeeCapacityRow>();

  if (error || !data) {
    throw new AppError("Employee profile not found.", 404);
  }

  return data;
}

async function ensureEmployeeExists(employeeId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, weekly_capacity_hours")
    .eq("id", employeeId)
    .single<EmployeeCapacityRow>();

  if (error || !data) {
    throw new AppError("Assigned employee was not found.", 404);
  }

  return data;
}

async function ensureProjectExists(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single<{ id: string }>();

  if (error || !data) {
    throw new AppError("Project not found.", 404);
  }
}

async function recalculateEmployeeCapacity(employeeId: string) {
  const employee = await ensureEmployeeExists(employeeId);
  const { data, error } = await supabase
    .from("tasks")
    .select("estimated_hours")
    .eq("assigned_employee_id", employeeId)
    .in("status", ACTIVE_TASK_STATUSES)
    .is("deleted_at", null)
    .returns<AssignedTaskHoursRow[]>();

  if (error) {
    throw new AppError("Unable to recalculate employee capacity.", 500);
  }

  const assignedHours = (data ?? []).reduce(
    (total, task) => total + Number(task.estimated_hours),
    0
  );
  const workloadPercentage = Math.min(
    100,
    Math.round((assignedHours / Number(employee.weekly_capacity_hours)) * 100)
  );
  const availabilityPercentage = Math.max(0, 100 - workloadPercentage);

  const { error: updateError } = await supabase
    .from("employees")
    .update({
      workload_percentage: workloadPercentage,
      availability_percentage: availabilityPercentage,
    })
    .eq("id", employeeId);

  if (updateError) {
    throw new AppError("Unable to update employee capacity.", 500);
  }
}

export async function listTasks(authUserId: string) {
  const appUser = await getAppUserByAuthId(authUserId);

  if (appUser.role === "employee") {
    const employee = await getEmployeeForAuthUser(authUserId);
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("assigned_employee_id", employee.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("Unable to fetch tasks.", 500);
    }

    return data;
  }

  assertRole(appUser, ["admin", "supervisor"]);

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("Unable to fetch tasks.", 500);
  }

  return data;
}

export async function createTask(authUserId: string, input: CreateTaskInput) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);
  await ensureProjectExists(input.projectId);

  if (input.assignedEmployeeId) {
    await ensureEmployeeExists(input.assignedEmployeeId);
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      estimated_hours: input.estimatedHours ?? 1,
      assigned_employee_id: input.assignedEmployeeId ?? null,
      assigned_at: input.assignedEmployeeId ? new Date().toISOString() : null,
      created_by_user_id: appUser.id,
    })
    .select(TASK_SELECT)
    .single();

  if (error || !data) {
    throw new AppError("Unable to create task.", 400);
  }

  if (input.assignedEmployeeId) {
    await recalculateEmployeeCapacity(input.assignedEmployeeId);
  }

  return data;
}

export async function assignTask(
  authUserId: string,
  taskId: string,
  employeeId: string | undefined
) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  const { data: existingTask, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_employee_id")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single<{ id: string; assigned_employee_id: string | null }>();

  if (taskError || !existingTask) {
    throw new AppError("Task not found.", 404);
  }

  if (employeeId) {
    await ensureEmployeeExists(employeeId);
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({
      assigned_employee_id: employeeId ?? null,
      assigned_at: employeeId ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .is("deleted_at", null)
    .select(TASK_SELECT)
    .single();

  if (error || !data) {
    throw new AppError("Unable to assign task.", 400);
  }

  if (existingTask.assigned_employee_id) {
    await recalculateEmployeeCapacity(existingTask.assigned_employee_id);
  }

  if (employeeId && employeeId !== existingTask.assigned_employee_id) {
    await recalculateEmployeeCapacity(employeeId);
  }

  return data;
}

export async function createTaskProgress(
  authUserId: string,
  taskId: string,
  input: CreateTaskProgressInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["employee"]);
  const employee = await getEmployeeForAuthUser(authUserId);

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_employee_id")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single<{ id: string; assigned_employee_id: string | null }>();

  if (taskError || !task) {
    throw new AppError("Task not found.", 404);
  }

  if (task.assigned_employee_id !== employee.id) {
    throw new AppError("Only the assigned employee can update task progress.", 403);
  }

  const { data: progress, error: progressError } = await supabase
    .from("task_progress")
    .insert({
      task_id: taskId,
      employee_id: employee.id,
      progress_percentage: input.progressPercentage,
      status: input.status ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (progressError || !progress) {
    throw new AppError("Unable to create task progress update.", 400);
  }

  const nextStatus =
    input.status ?? (input.progressPercentage === 100 ? "completed" : "in_progress");
  const { error: updateTaskError } = await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (updateTaskError) {
    throw new AppError("Progress was saved, but task status was not updated.", 500);
  }

  await recalculateEmployeeCapacity(employee.id);

  return progress;
}
