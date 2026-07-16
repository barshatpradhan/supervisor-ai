import { supabase } from "../config/supabase.js";
import type {
  AssignableEmployeeDirectoryEntry,
  SupervisorEmployeeDirectoryQuery,
} from "../types/employee.js";
import { AppError } from "../utils/appError.js";
import { enrichEmployeesWithCapacityMetrics } from "./employeeMetricsService.js";
import { getSkillsByEmployeeIds } from "./skillService.js";
import { getAppUserByAuthId } from "./userService.js";

interface EmployeeDirectoryRow {
  id: string;
  full_name: string;
  employment_type: "full_time" | "part_time";
  availability_percentage: number | null;
  workload_percentage: number | null;
  weekly_capacity_hours: number | null;
  performance_score: number | null;
}

export interface CreateSupervisorProfileRecordInput {
  full_name: string;
  department?: string;
  bio?: string;
  organization_id?: string;
}

function normalizeSkillFilter(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getSupervisorProfileByAuthId(
  authUserId: string,
  organizationId?: string
) {
  let request = supabase
    .from("supervisors")
    .select(`
      id,
      organization_id,
      full_name,
      department,
      bio,
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

  if (error || !data) {
    throw new AppError("Supervisor profile not found.", 404);
  }

  return data;
}

export async function createSupervisorProfile(
  authUserId: string,
  organizationId: string | undefined,
  profileData: CreateSupervisorProfileRecordInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const effectiveOrganizationId = organizationId;

  if (!effectiveOrganizationId) {
    throw new AppError("Organization context is required.", 500);
  }

  return createSupervisorProfileRecordForOrganization({
    userId: appUser.id,
    full_name: profileData.full_name,
    department: profileData.department,
    bio: profileData.bio,
    organization_id: effectiveOrganizationId,
  });
}

export async function createSupervisorProfileRecordForUser(
  appUser: { id: string; role: "employee" | "supervisor" | "admin" },
  profileData: CreateSupervisorProfileRecordInput
) {
  if (appUser.role !== "supervisor") {
    throw new AppError("Only supervisor users can create supervisor profiles.", 403);
  }

  const { data, error } = await supabase
    .from("supervisors")
    .insert({
      user_id: appUser.id,
      full_name: profileData.full_name,
      department: profileData.department ?? null,
      bio: profileData.bio ?? null,
      organization_id: profileData.organization_id ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("Unable to create supervisor profile.", 400);
  }

  return data;
}

export async function updateSupervisorProfile(
  authUserId: string,
  organizationId: string,
  profileData: {
    full_name?: string;
    department?: string | null;
    bio?: string | null;
  }
) {
  const updates: Record<string, unknown> = {};

  if (profileData.full_name !== undefined) {
    updates.full_name = profileData.full_name;
  }

  if (profileData.department !== undefined) {
    updates.department = profileData.department;
  }

  if (profileData.bio !== undefined) {
    updates.bio = profileData.bio;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one profile field is required.", 400);
  }

  const currentSupervisor = await getSupervisorProfileByAuthId(authUserId, organizationId);

  const { data, error } = await supabase
    .from("supervisors")
    .update(updates)
    .eq("id", currentSupervisor.id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Unable to update supervisor profile.", 400);
  }

  return data;
}

export async function createSupervisorProfileRecordForOrganization(input: {
  userId: string;
  full_name: string;
  department?: string;
  bio?: string;
  organization_id: string;
}) {
  const { data, error } = await supabase
    .from("supervisors")
    .insert({
      user_id: input.userId,
      full_name: input.full_name,
      department: input.department ?? null,
      bio: input.bio ?? null,
      organization_id: input.organization_id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Unable to create supervisor profile.", 400);
  }

  return data;
}

export async function listAssignableEmployees(
  authUserId: string,
  organizationId: string,
  query: SupervisorEmployeeDirectoryQuery
) {
  await getAppUserByAuthId(authUserId);

  let employeeQuery = supabase
    .from("employees")
    .select(
      "id, full_name, employment_type, availability_percentage, workload_percentage, weekly_capacity_hours, performance_score"
    )
    .eq("organization_id", organizationId)
    .order("availability_percentage", { ascending: false })
    .order("performance_score", { ascending: false })
    .order("full_name", { ascending: true });

  if (query.search) {
    employeeQuery = employeeQuery.ilike("full_name", `%${query.search}%`);
  }

  if (query.availability_min !== undefined) {
    employeeQuery = employeeQuery.gte(
      "availability_percentage",
      query.availability_min
    );
  }

  if (query.employment_type) {
    employeeQuery = employeeQuery.eq("employment_type", query.employment_type);
  }

  const { data, error } = await employeeQuery.returns<EmployeeDirectoryRow[]>();

  if (error) {
    throw new AppError("Unable to fetch assignable employees.", 500);
  }

  const employees = await enrichEmployeesWithCapacityMetrics(data ?? []);
  const skillsByEmployeeId = await getSkillsByEmployeeIds(
    employees.map((employee) => employee.id)
  );
  const normalizedSkill = query.skill ? normalizeSkillFilter(query.skill) : undefined;

  const filteredEmployees = normalizedSkill
    ? employees.filter((employee) =>
        (skillsByEmployeeId.get(employee.id) ?? []).some(
          (skill) => skill.normalizedName === normalizedSkill
        )
      )
    : employees;

  return filteredEmployees
    .map<AssignableEmployeeDirectoryEntry>((employee) => ({
      id: employee.id,
      full_name: employee.full_name,
      employment_type: employee.employment_type,
      availability_percentage: Number(employee.availability_percentage ?? 0),
      workload_percentage: Number(employee.workload_percentage ?? 0),
      weekly_capacity_hours: Number(employee.weekly_capacity_hours ?? 0),
      performance_score:
        employee.performance_score === null ? null : Number(employee.performance_score),
      skills: (skillsByEmployeeId.get(employee.id) ?? []).map((skill) => ({
        name: skill.name,
        proficiency_level: skill.proficiencyLevel,
        years_of_experience: skill.yearsOfExperience,
      })),
    }))
    .sort((left, right) => {
      const availabilityDelta =
        right.availability_percentage - left.availability_percentage;

      if (availabilityDelta !== 0) {
        return availabilityDelta;
      }

      const performanceDelta =
        (right.performance_score ?? -1) - (left.performance_score ?? -1);

      if (performanceDelta !== 0) {
        return performanceDelta;
      }

      return left.full_name.localeCompare(right.full_name);
    });
}
