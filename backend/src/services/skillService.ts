import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string;
  is_approved: boolean;
  created_by: string | null;
  category: string | null;
  created_at: string;
}

interface EmployeeSkillRow {
  skill_id: string;
  proficiency_level: number | null;
  years_of_experience: number | null;
}

interface ExistingEmployeeSkillRow extends EmployeeSkillRow {
  employee_id: string;
}

export interface EmployeeSkillResponse {
  id: string;
  name: string;
  normalizedName: string;
  isApproved: boolean;
  proficiencyLevel: number;
  yearsOfExperience: number | null;
  category: string | null;
}

function normalizeSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();
  const result: Array<{ name: string; normalizedName: string }> = [];

  for (const skill of skills) {
    const name = skill.replace(/\s+/g, " ").trim();
    const normalizedName = normalizeSkill(name);

    if (!name || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    result.push({ name, normalizedName });
  }

  return result;
}

function mapSkill(row: SkillRow) {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    isApproved: row.is_approved,
    createdBy: row.created_by,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function listApprovedSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, normalized_name, is_approved, created_by, category, created_at")
    .eq("is_approved", true)
    .order("name", { ascending: true })
    .returns<SkillRow[]>();

  if (error) {
    throw new AppError("Unable to fetch approved skills.", 500);
  }

  return (data ?? []).map(mapSkill);
}

export async function listPendingSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, normalized_name, is_approved, created_by, category, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .returns<SkillRow[]>();

  if (error) {
    throw new AppError("Unable to fetch pending skills.", 500);
  }

  return (data ?? []).map(mapSkill);
}

export async function approveSkill(skillId: string) {
  const { data, error } = await supabase
    .from("skills")
    .update({ is_approved: true })
    .eq("id", skillId)
    .select("id, name, normalized_name, is_approved, created_by, category, created_at")
    .single<SkillRow>();

  if (error || !data) {
    throw new AppError("Unable to approve skill.", 400);
  }

  return mapSkill(data);
}

export async function rejectSkill(skillId: string) {
  const { error: linkDeleteError } = await supabase
    .from("employee_skills")
    .delete()
    .eq("skill_id", skillId);

  if (linkDeleteError) {
    throw new AppError("Unable to remove rejected skill links.", 400);
  }

  const { error } = await supabase.from("skills").delete().eq("id", skillId);

  if (error) {
    throw new AppError("Unable to reject skill.", 400);
  }
}

export async function getEmployeeSkills(employeeId: string) {
  const { data: employeeSkills, error: employeeSkillsError } = await supabase
    .from("employee_skills")
    .select("skill_id, proficiency_level, years_of_experience")
    .eq("employee_id", employeeId)
    .returns<EmployeeSkillRow[]>();

  if (employeeSkillsError) {
    throw new AppError("Unable to fetch employee skills.", 500);
  }

  const skillIds = (employeeSkills ?? []).map((skill) => skill.skill_id);

  if (skillIds.length === 0) {
    return [];
  }

  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("id, name, normalized_name, is_approved, created_by, category, created_at")
    .in("id", skillIds)
    .returns<SkillRow[]>();

  if (skillsError) {
    throw new AppError("Unable to fetch employee skill names.", 500);
  }

  const skillById = new Map((skills ?? []).map((skill) => [skill.id, skill]));

  return (employeeSkills ?? []).flatMap<EmployeeSkillResponse>((employeeSkill) => {
    const skill = skillById.get(employeeSkill.skill_id);

    if (!skill) {
      return [];
    }

    return [
      {
        id: skill.id,
        name: skill.name,
        normalizedName: skill.normalized_name,
        isApproved: skill.is_approved,
        proficiencyLevel: employeeSkill.proficiency_level ?? 3,
        yearsOfExperience: employeeSkill.years_of_experience,
        category: skill.category,
      },
    ];
  });
}

export async function syncEmployeeSkills(
  employeeId: string,
  appUserId: string,
  skills: string[]
) {
  const uniqueSkillNames = uniqueSkills(skills);
  const { data: currentEmployeeSkills, error: currentEmployeeSkillsError } =
    await supabase
      .from("employee_skills")
      .select("employee_id, skill_id, proficiency_level, years_of_experience")
      .eq("employee_id", employeeId)
      .returns<ExistingEmployeeSkillRow[]>();

  if (currentEmployeeSkillsError) {
    throw new AppError("Unable to fetch current employee skills.", 500);
  }

  const currentSkillById = new Map(
    (currentEmployeeSkills ?? []).map((skill) => [skill.skill_id, skill])
  );

  const { error: deleteError } = await supabase
    .from("employee_skills")
    .delete()
    .eq("employee_id", employeeId);

  if (deleteError) {
    throw new AppError("Unable to update employee skills.", 500);
  }

  if (uniqueSkillNames.length === 0) {
    return;
  }

  const normalizedNames = uniqueSkillNames.map((skill) => skill.normalizedName);
  const { data: existingSkills, error: existingSkillsError } = await supabase
    .from("skills")
    .select("id, name, normalized_name, is_approved, created_by, category, created_at")
    .in("normalized_name", normalizedNames)
    .returns<SkillRow[]>();

  if (existingSkillsError) {
    throw new AppError("Unable to fetch existing skills.", 500);
  }

  const existingNormalizedNames = new Set(
    (existingSkills ?? []).map((skill) => skill.normalized_name)
  );
  const missingSkills = uniqueSkillNames.filter(
    (skill) => !existingNormalizedNames.has(skill.normalizedName)
  );
  let createdSkills: SkillRow[] = [];

  if (missingSkills.length > 0) {
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("skills")
      .insert(
        missingSkills.map((skill) => ({
          id: crypto.randomUUID(),
          name: skill.name,
          normalized_name: skill.normalizedName,
          is_approved: false,
          created_by: appUserId,
          created_at: createdAt,
        }))
      )
      .select("id, name, normalized_name, is_approved, created_by, category, created_at")
      .returns<SkillRow[]>();

    if (error || !data) {
      throw new AppError("Unable to create employee skills.", 500);
    }

    createdSkills = data;
  }

  const skillByNormalizedName = new Map(
    [...(existingSkills ?? []), ...createdSkills].map((skill) => [
      skill.normalized_name,
      skill,
    ])
  );
  const skillsToLink = uniqueSkillNames
    .map((skill) => skillByNormalizedName.get(skill.normalizedName))
    .filter((skill): skill is SkillRow => Boolean(skill));

  if (skillsToLink.length === 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("employee_skills").upsert(
    skillsToLink.map((skill) => ({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      skill_id: skill.id,
      proficiency_level: currentSkillById.get(skill.id)?.proficiency_level ?? 3,
      years_of_experience:
        currentSkillById.get(skill.id)?.years_of_experience ?? null,
      created_at: createdAt,
    })),
    { onConflict: "employee_id,skill_id", ignoreDuplicates: true }
  );

  if (insertError) {
    throw new AppError("Unable to assign employee skills.", 500);
  }
}
