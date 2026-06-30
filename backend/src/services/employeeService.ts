import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import { getAppUserByAuthId } from "./userService.js";
import { getEmployeeSkills, syncEmployeeSkills } from "./skillService.js";

type EmploymentType = "full_time" | "part_time";

interface EmployeeProfileInput {
  full_name?: string;
  bio?: string | null;
  skills?: string[];
}

interface CreateEmployeeProfileInput extends EmployeeProfileInput {
  full_name: string;
  employment_type?: EmploymentType;
  weekly_capacity_hours?: number;
}

interface EmployeeWorkSettingsInput {
  employment_type?: EmploymentType;
  weekly_capacity_hours?: number;
}

interface EmployeeCapacityRow {
  id: string;
  weekly_capacity_hours: number;
}

interface AssignedTaskHoursRow {
  estimated_hours: number;
}

const ACTIVE_TASK_STATUSES = ["todo", "in_progress", "blocked", "review"];

function availabilityFromWorkload(workloadPercentage: number) {
  return Math.max(0, Math.min(100, 100 - workloadPercentage));
}

async function withSkills<T extends { id: string }>(employee: T) {
  const skills = await getEmployeeSkills(employee.id);
  return { ...employee, skills };
}

async function ensureEmployeeExists(employeeId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, weekly_capacity_hours")
    .eq("id", employeeId)
    .single<EmployeeCapacityRow>();

  if (error || !data) {
    throw new AppError("Employee not found.", 404);
  }

  return data;
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

  const { data: updatedEmployee, error: updateError } = await supabase
    .from("employees")
    .update({
      workload_percentage: workloadPercentage,
      availability_percentage: availabilityFromWorkload(workloadPercentage),
    })
    .eq("id", employeeId)
    .select()
    .single();

  if (updateError || !updatedEmployee) {
    throw new AppError("Unable to update employee capacity.", 500);
  }

  return updatedEmployee;
}

export async function getEmployeeProfileByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      full_name,
      employment_type,
      weekly_capacity_hours,
      availability_percentage,
      workload_percentage,
      bio,
      performance_score,
      created_at,
      users!inner (
        id,
        auth_user_id,
        role
      )
    `)
    .eq("users.auth_user_id", authUserId)
    .single();

  if (error) {
    throw new AppError("Employee profile not found.", 404);
  }

  return withSkills(data);
}

export async function createEmployeeProfile(
  authUserId: string,
  profileData: CreateEmployeeProfileInput
) {
  const appUser = await getAppUserByAuthId(authUserId);

  if (appUser.role !== "employee") {
    throw new AppError("Only employee users can create employee profiles.", 403);
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      user_id: appUser.id,
      full_name: profileData.full_name,
      bio: profileData.bio ?? null,
      employment_type: profileData.employment_type ?? "full_time",
      weekly_capacity_hours: profileData.weekly_capacity_hours ?? 40,
      workload_percentage: 0,
      availability_percentage: availabilityFromWorkload(0),
    })
    .select()
    .single()

  if (error) {
    throw new AppError("Unable to create employee profile.", 400);
  }

  if (profileData.skills !== undefined) {
    await syncEmployeeSkills(data.id, appUser.id, profileData.skills);
  }

  return withSkills(data);
}

export async function updateEmployeeProfile(
  authUserId: string,
  profileData: EmployeeProfileInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const updates: Record<string, unknown> = {};

  if (appUser.role !== "employee") {
    throw new AppError("Only employee users can update employee profiles.", 403);
  }

  if (profileData.full_name !== undefined) {
    updates.full_name = profileData.full_name;
  }

  if (profileData.bio !== undefined) {
    updates.bio = profileData.bio;
  }

  const hasProfileUpdates = Object.keys(updates).length > 0;
  const hasSkillUpdates = profileData.skills !== undefined;

  if (!hasProfileUpdates && !hasSkillUpdates) {
    throw new AppError("At least one profile field is required.", 400);
  }

  const currentEmployee = await getEmployeeProfileByAuthId(authUserId);

  if (hasProfileUpdates) {
    const { data, error } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", currentEmployee.id)
      .select()
      .single();

    if (error || !data) {
      throw new AppError("Unable to update employee profile.", 400);
    }

    if (hasSkillUpdates) {
      await syncEmployeeSkills(data.id, appUser.id, profileData.skills ?? []);
    }

    return withSkills(data);
  }

  await syncEmployeeSkills(currentEmployee.id, appUser.id, profileData.skills ?? []);
  return getEmployeeProfileByAuthId(authUserId);
}

export async function updateEmployeeWorkSettings(
  employeeId: string,
  input: EmployeeWorkSettingsInput
) {
  const updates: Record<string, unknown> = {};

  await ensureEmployeeExists(employeeId);

  if (input.employment_type !== undefined) {
    updates.employment_type = input.employment_type;
  }

  if (input.weekly_capacity_hours !== undefined) {
    updates.weekly_capacity_hours = input.weekly_capacity_hours;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one work setting is required.", 400);
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", employeeId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Unable to update employee work settings.", 400);
  }

  if (input.weekly_capacity_hours !== undefined) {
    const recalculatedEmployee = await recalculateEmployeeCapacity(data.id);
    return withSkills(recalculatedEmployee);
  }

  return withSkills(data);
}
