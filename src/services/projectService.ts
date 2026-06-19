import { supabase } from "../config/supabase.js";
import type { CreateProjectInput, UpdateProjectInput } from "../types/project.js";
import { AppError } from "../utils/appError.js";
import { assertRole, getAppUserByAuthId } from "./userService.js";

const PROJECT_SELECT = `
  id,
  title,
  description,
  status,
  priority,
  required_skills,
  created_by_user_id,
  created_at,
  updated_at
`;

function mapRequiredSkills(requiredSkills?: string[]) {
  // TODO: projects.required_skills text[] is MVP-only; migrate to project_required_skills.
  return requiredSkills?.map((skill) => skill.trim()).filter(Boolean);
}

export async function listProjects(authUserId: string) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("Unable to fetch projects.", 500);
  }

  return data;
}

export async function getProjectById(authUserId: string, projectId: string) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new AppError("Project not found.", 404);
  }

  return data;
}

export async function createProject(authUserId: string, input: CreateProjectInput) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "draft",
      priority: input.priority ?? "medium",
      required_skills: mapRequiredSkills(input.requiredSkills) ?? [],
      created_by_user_id: appUser.id,
    })
    .select(PROJECT_SELECT)
    .single();

  if (error || !data) {
    throw new AppError("Unable to create project.", 400);
  }

  return data;
}

export async function updateProject(
  authUserId: string,
  projectId: string,
  input: UpdateProjectInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) {
    updates.title = input.title;
  }

  if (input.description !== undefined) {
    updates.description = input.description;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
  }

  if (input.priority !== undefined) {
    updates.priority = input.priority;
  }

  if (input.requiredSkills !== undefined) {
    updates.required_skills = mapRequiredSkills(input.requiredSkills) ?? [];
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one project field is required.", 400);
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .is("deleted_at", null)
    .select(PROJECT_SELECT)
    .single();

  if (error || !data) {
    throw new AppError("Unable to update project.", 400);
  }

  return data;
}
