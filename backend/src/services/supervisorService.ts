import { supabase } from "../config/supabase.js";
import type {
  AssignableEmployeeDirectoryEntry,
  SupervisorEmployeeDirectoryQuery,
} from "../types/employee.js";
import { AppError } from "../utils/appError.js";
import { enrichEmployeesWithCapacityMetrics } from "./employeeMetricsService.js";
import { getSkillsByEmployeeIds } from "./skillService.js";
import { assertRole, getAppUserByAuthId } from "./userService.js";

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
}

function normalizeSkillFilter(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getSupervisorProfileByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("supervisors")
    .select(`
      id,
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
    .eq("users.auth_user_id", authUserId)
    .single();

  if (error) {
    throw new AppError("Supervisor profile not found.", 404);
  }

  return data;
}

export async function createSupervisorProfile(
  authUserId: string,
  profileData: CreateSupervisorProfileRecordInput
) {
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .single();

  if (userError || !appUser) {
    throw new AppError("Application user profile was not found.", 404);
  }

  if (appUser.role !== "supervisor") {
    throw new AppError("Only supervisor users can create supervisor profiles.", 403);
  }

  return createSupervisorProfileRecordForUser(appUser, profileData);
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
    })
    .select()
    .single();

  if (error) {
    throw new AppError("Unable to create supervisor profile.", 400);
  }

  return data;
}

export async function listAssignableEmployees(
  authUserId: string,
  query: SupervisorEmployeeDirectoryQuery
) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  let employeeQuery = supabase
    .from("employees")
    .select(
      "id, full_name, employment_type, availability_percentage, workload_percentage, weekly_capacity_hours, performance_score"
    )
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
