import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import { enrichEmployeesWithCapacityMetrics } from "./employeeMetricsService.js";
import { getAppUserByAuthId } from "./userService.js";
import {
  getEmployeeSkills,
  replaceEmployeeSkillsWithDetails,
  type EmployeeSkillInput,
} from "./skillService.js";

type EmploymentType = "full_time" | "part_time";

interface EmployeeProfileInput {
  full_name?: string;
  job_title?: string | null;
  department?: string | null;
  bio?: string | null;
  skills?: EmployeeSkillInput[];
}

interface CreateEmployeeProfileInput extends EmployeeProfileInput {
  full_name: string;
  job_title?: string | null;
  department?: string | null;
  employment_type?: EmploymentType;
  weekly_capacity_hours?: number;
}

export interface CreateEmployeeProfileRecordInput {
  full_name: string;
  job_title?: string | null;
  department?: string | null;
  bio?: string | null;
  employment_type?: EmploymentType;
  organization_id?: string;
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

function calculateWorkloadPercentage(
  assignedHours: number,
  weeklyCapacityHours: number
) {
  const normalizedAssignedHours = Number.isFinite(assignedHours)
    ? Math.max(0, assignedHours)
    : 0;
  const normalizedCapacityHours = Number(weeklyCapacityHours);

  if (!Number.isFinite(normalizedCapacityHours) || normalizedCapacityHours <= 0) {
    return normalizedAssignedHours > 0 ? 100 : 0;
  }

  return Math.min(
    100,
    Math.round((normalizedAssignedHours / normalizedCapacityHours) * 100)
  );
}

async function withSkills<T extends { id: string }>(employee: T) {
  const skills = await getEmployeeSkills(employee.id);
  return { ...employee, skills };
}

async function insertEmployeeProfileRecord(input: {
  userId: string;
  full_name: string;
  job_title?: string | null;
  department?: string | null;
  bio?: string | null;
  employment_type?: EmploymentType;
  organization_id?: string;
  weekly_capacity_hours?: number;
}) {
  const { data, error } = await supabase
    .from("employees")
    .insert({
      user_id: input.userId,
      full_name: input.full_name,
      job_title: input.job_title ?? null,
      department: input.department ?? null,
      bio: input.bio ?? null,
      employment_type: input.employment_type ?? "full_time",
      weekly_capacity_hours: input.weekly_capacity_hours ?? 40,
      workload_percentage: 0,
      availability_percentage: availabilityFromWorkload(0),
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Unable to create employee profile.", 400);
  }

  return data;
}

export async function createEmployeeProfileRecordForUser(
  appUser: { id: string; legacyRole: "employee" | "supervisor" | "admin" | null },
  profileData: CreateEmployeeProfileRecordInput
) {
  if (appUser.legacyRole !== "employee") {
    throw new AppError("Only employee users can create employee profiles.", 403);
  }

  return insertEmployeeProfileRecord({
    userId: appUser.id,
    full_name: profileData.full_name,
    job_title: profileData.job_title,
    department: profileData.department,
    bio: profileData.bio,
    employment_type: profileData.employment_type,
    organization_id: profileData.organization_id,
    weekly_capacity_hours: profileData.weekly_capacity_hours,
  });
}

export async function createEmployeeProfileRecordForOrganization(input: {
  userId: string;
  full_name: string;
  job_title?: string | null;
  department?: string | null;
  bio?: string | null;
  employment_type?: EmploymentType;
  organization_id: string;
  weekly_capacity_hours?: number;
}) {
  return insertEmployeeProfileRecord(input);
}

async function ensureEmployeeExists(employeeId: string, organizationId?: string) {
  let request = supabase
    .from("employees")
    .select("id, weekly_capacity_hours")
    .eq("id", employeeId);

  if (organizationId) {
    request = request.eq("organization_id", organizationId);
  }

  const { data, error } = await request.single<EmployeeCapacityRow>();

  if (error || !data) {
    throw new AppError("Employee not found.", 404);
  }

  return data;
}

async function recalculateEmployeeCapacity(employeeId: string, organizationId?: string) {
  const employee = await ensureEmployeeExists(employeeId, organizationId);
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
  const workloadPercentage = calculateWorkloadPercentage(
    assignedHours,
    Number(employee.weekly_capacity_hours)
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

export async function getEmployeeProfileByAuthId(
  authUserId: string,
  organizationId?: string
) {
  let request = supabase
    .from("employees")
    .select(`
      id,
      organization_id,
      full_name,
      job_title,
      department,
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
    .eq("users.auth_user_id", authUserId);

  if (organizationId) {
    request = request.eq("organization_id", organizationId);
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError("Employee profile not found.", 404);
  }

  if (!data) {
    throw new AppError("Employee profile not found.", 404);
  }

  const [employee] = await enrichEmployeesWithCapacityMetrics([data]);
  return withSkills(employee);
}

export async function createEmployeeProfile(
  authUserId: string,
  organizationId: string | undefined,
  profileData: CreateEmployeeProfileInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const effectiveOrganizationId = organizationId;

  if (!effectiveOrganizationId) {
    throw new AppError("Organization context is required.", 500);
  }

  const data = await createEmployeeProfileRecordForOrganization({
    userId: appUser.id,
    full_name: profileData.full_name,
    job_title: profileData.job_title,
    department: profileData.department,
    bio: profileData.bio,
    employment_type: profileData.employment_type,
    organization_id: effectiveOrganizationId,
    weekly_capacity_hours: profileData.weekly_capacity_hours,
  });

  if (profileData.skills !== undefined) {
    await replaceEmployeeSkillsWithDetails(
      data.id,
      appUser.id,
      profileData.skills,
      effectiveOrganizationId
    );
  }

  const [employee] = await enrichEmployeesWithCapacityMetrics([data]);
  return withSkills(employee);
}

export async function updateEmployeeProfile(
  authUserId: string,
  organizationId: string | undefined,
  profileData: EmployeeProfileInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const updates: Record<string, unknown> = {};

  if (profileData.full_name !== undefined) {
    updates.full_name = profileData.full_name;
  }

  if (profileData.job_title !== undefined) updates.job_title = profileData.job_title;
  if (profileData.department !== undefined) updates.department = profileData.department;

  if (profileData.bio !== undefined) {
    updates.bio = profileData.bio;
  }

  const hasProfileUpdates = Object.keys(updates).length > 0;
  const hasSkillUpdates = profileData.skills !== undefined;

  if (!hasProfileUpdates && !hasSkillUpdates) {
    throw new AppError("At least one profile field is required.", 400);
  }

  const currentEmployee = await getEmployeeProfileByAuthId(authUserId, organizationId);

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
      await replaceEmployeeSkillsWithDetails(
        data.id,
        appUser.id,
        profileData.skills ?? [],
        organizationId
      );
    }

    const [employee] = await enrichEmployeesWithCapacityMetrics([data]);
    return withSkills(employee);
  }

  await replaceEmployeeSkillsWithDetails(
    currentEmployee.id,
    appUser.id,
    profileData.skills ?? [],
    organizationId
  );
  return getEmployeeProfileByAuthId(authUserId, organizationId);
}

export async function updateEmployeeWorkSettings(
  employeeId: string,
  organizationId: string,
  input: EmployeeWorkSettingsInput
) {
  const updates: Record<string, unknown> = {};

  await ensureEmployeeExists(employeeId, organizationId);

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
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Unable to update employee work settings.", 400);
  }

  if (input.weekly_capacity_hours !== undefined) {
    const recalculatedEmployee = await recalculateEmployeeCapacity(
      data.id,
      organizationId
    );
    return withSkills(recalculatedEmployee);
  }

  const [employee] = await enrichEmployeesWithCapacityMetrics([data]);
  return withSkills(employee);
}
