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

interface EmployeeSkillLinkRow extends EmployeeSkillRow {
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

export interface EmployeeSkillInput {
  name: string;
  proficiency_level?: number;
  years_of_experience?: number | null;
}

interface NormalizedEmployeeSkillInput {
  name: string;
  normalizedName: string;
  proficiencyLevel: number;
  yearsOfExperience: number | null;
}

interface ResolvedEmployeeSkillsResult {
  createdSkillIds: string[];
  skillsToLink: Array<{
    input: NormalizedEmployeeSkillInput;
    skill: SkillRow;
  }>;
}

const DEFAULT_PROFICIENCY_LEVEL = 3;
const MAX_PROFICIENCY_LEVEL = 5;
const MAX_YEARS_OF_EXPERIENCE = 80;

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

function normalizeProficiencyLevel(value: number | undefined) {
  if (value === undefined) {
    return DEFAULT_PROFICIENCY_LEVEL;
  }

  if (!Number.isInteger(value) || value < 1 || value > MAX_PROFICIENCY_LEVEL) {
    throw new AppError(
      `Skill proficiency_level must be an integer between 1 and ${MAX_PROFICIENCY_LEVEL}.`,
      400
    );
  }

  return value;
}

function normalizeYearsOfExperience(value: number | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_YEARS_OF_EXPERIENCE
  ) {
    throw new AppError(
      `Skill years_of_experience must be between 0 and ${MAX_YEARS_OF_EXPERIENCE}.`,
      400
    );
  }

  return value;
}

function uniqueDetailedSkills(skills: EmployeeSkillInput[]) {
  const seen = new Set<string>();
  const result: NormalizedEmployeeSkillInput[] = [];

  for (const skill of skills) {
    const name = skill.name.replace(/\s+/g, " ").trim();
    const normalizedName = normalizeSkill(name);

    if (!name || !normalizedName || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    result.push({
      name,
      normalizedName,
      proficiencyLevel: normalizeProficiencyLevel(skill.proficiency_level),
      yearsOfExperience: normalizeYearsOfExperience(skill.years_of_experience),
    });
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

async function resolveEmployeeSkills(
  appUserId: string,
  skills: NormalizedEmployeeSkillInput[]
): Promise<ResolvedEmployeeSkillsResult> {
  if (skills.length === 0) {
    return {
      createdSkillIds: [],
      skillsToLink: [],
    };
  }

  const normalizedNames = skills.map((skill) => skill.normalizedName);
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
  const missingSkills = skills.filter(
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

  return {
    createdSkillIds: createdSkills.map((skill) => skill.id),
    skillsToLink: skills
      .map((input) => {
        const resolvedSkill = skillByNormalizedName.get(input.normalizedName);

        if (!resolvedSkill) {
          return null;
        }

        return {
          input,
          skill: resolvedSkill,
        };
      })
      .filter(
        (
          value
        ): value is {
          input: NormalizedEmployeeSkillInput;
          skill: SkillRow;
        } => Boolean(value)
      ),
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

export async function getSkillsByEmployeeIds(employeeIds: string[]) {
  const skillMap = new Map<string, EmployeeSkillResponse[]>();

  for (const employeeId of employeeIds) {
    skillMap.set(employeeId, []);
  }

  if (employeeIds.length === 0) {
    return skillMap;
  }

  const { data: employeeSkills, error: employeeSkillsError } = await supabase
    .from("employee_skills")
    .select("employee_id, skill_id, proficiency_level, years_of_experience")
    .in("employee_id", employeeIds)
    .returns<EmployeeSkillLinkRow[]>();

  if (employeeSkillsError) {
    throw new AppError("Unable to fetch employee skills.", 500);
  }

  const skillIds = [...new Set((employeeSkills ?? []).map((skill) => skill.skill_id))];

  if (skillIds.length === 0) {
    return skillMap;
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

  for (const employeeSkill of employeeSkills ?? []) {
    const skill = skillById.get(employeeSkill.skill_id);

    if (!skill) {
      continue;
    }

    const currentSkills = skillMap.get(employeeSkill.employee_id) ?? [];
    currentSkills.push({
      id: skill.id,
      name: skill.name,
      normalizedName: skill.normalized_name,
      isApproved: skill.is_approved,
      proficiencyLevel: employeeSkill.proficiency_level ?? 3,
      yearsOfExperience: employeeSkill.years_of_experience,
      category: skill.category,
    });
    skillMap.set(employeeSkill.employee_id, currentSkills);
  }

  return skillMap;
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

  const resolvedSkills = await resolveEmployeeSkills(
    appUserId,
    uniqueSkillNames.map((skill) => ({
      name: skill.name,
      normalizedName: skill.normalizedName,
      proficiencyLevel: DEFAULT_PROFICIENCY_LEVEL,
      yearsOfExperience: null,
    }))
  );

  if (resolvedSkills.skillsToLink.length === 0) {
    return;
  }

  const createdAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("employee_skills").upsert(
    resolvedSkills.skillsToLink.map(({ skill }) => ({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      skill_id: skill.id,
      proficiency_level:
        currentSkillById.get(skill.id)?.proficiency_level ?? DEFAULT_PROFICIENCY_LEVEL,
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

export async function replaceEmployeeSkillsWithDetails(
  employeeId: string,
  appUserId: string,
  skills: EmployeeSkillInput[]
) {
  const uniqueSkillInputs = uniqueDetailedSkills(skills);

  const { error: deleteError } = await supabase
    .from("employee_skills")
    .delete()
    .eq("employee_id", employeeId);

  if (deleteError) {
    throw new AppError("Unable to update employee skills.", 500);
  }

  if (uniqueSkillInputs.length === 0) {
    return {
      createdSkillIds: [],
    };
  }

  const resolvedSkills = await resolveEmployeeSkills(appUserId, uniqueSkillInputs);

  if (resolvedSkills.skillsToLink.length === 0) {
    return {
      createdSkillIds: resolvedSkills.createdSkillIds,
    };
  }

  const createdAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("employee_skills").upsert(
    resolvedSkills.skillsToLink.map(({ input, skill }) => ({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      skill_id: skill.id,
      proficiency_level: input.proficiencyLevel,
      years_of_experience: input.yearsOfExperience,
      created_at: createdAt,
    })),
    { onConflict: "employee_id,skill_id", ignoreDuplicates: true }
  );

  if (insertError) {
    throw new AppError("Unable to assign employee skills.", 500);
  }

  return {
    createdSkillIds: resolvedSkills.createdSkillIds,
  };
}
