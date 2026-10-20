import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import { isSkillCategory, MAX_SKILL_NAME_LENGTH, skillMatchKey } from "../utils/skillNames.js";
import { materializeSkillResolutions, rememberSkillAlias, resolveSkillNames } from "./skillResolutionService.js";

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string;
  organization_id: string | null;
  is_approved: boolean;
  created_by: string | null;
  category: string | null;
  created_at: string;
}

export interface PublicApprovedSkillsQuery {
  search?: string;
  category?: string;
}

export interface PublicSkillResponse {
  id: string;
  name: string;
  normalizedName: string;
  category: string | null;
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
    skill: { id: string };
  }>;
}

export interface ReplaceEmployeeSkillsResult {
  createdSkillIds: string[];
  linkedSkillIds: string[];
}

const DEFAULT_PROFICIENCY_LEVEL = 3;
const MAX_PROFICIENCY_LEVEL = 5;
const MAX_YEARS_OF_EXPERIENCE = 80;

function logSkillProvisioningEvent(
  event: string,
  details: Record<string, unknown>
) {
  console.error(
    JSON.stringify({
      scope: "skill_provisioning",
      event,
      ...details,
    })
  );
}

function formatSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message ?? null,
  };
}

function createSkillProvisioningError(
  message: string,
  operation: string,
  error: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  },
  context: Record<string, unknown> = {}
) {
  logSkillProvisioningEvent("supabase_error", {
    operation,
    ...formatSupabaseError(error),
    ...context,
  });

  return new AppError(message, 500, true, { cause: error });
}

/** Same key as the database's skill_match_key(), so "Node.js" and "nodejs" dedupe. */
function normalizeSkill(skill: string) {
  return skillMatchKey(skill);
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

function mapPublicSkill(row: SkillRow): PublicSkillResponse {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    category: row.category,
  };
}

/**
 * Maps typed skills to catalog skills (exact, alias or AI match), creating pending skills
 * only for real skills that are not stored yet. Rejects inputs that are not skills.
 * Skills are global; organizationId is kept for callers but no longer scopes skills.
 */
async function resolveEmployeeSkills(
  appUserId: string,
  skills: NormalizedEmployeeSkillInput[],
  _organizationId?: string
): Promise<ResolvedEmployeeSkillsResult> {
  if (skills.length === 0) {
    return { createdSkillIds: [], skillsToLink: [] };
  }

  const resolutions = await resolveSkillNames(skills.map((skill) => skill.name));
  const { createdSkillIds, skillByInput } = await materializeSkillResolutions(resolutions, appUserId);
  const resolutionByKey = new Map(resolutions.map((resolution) => [skillMatchKey(resolution.input), resolution]));

  logSkillProvisioningEvent("skills_resolved", {
    inputCount: skills.length,
    createdCount: createdSkillIds.length,
    correctedCount: resolutions.filter((resolution) => resolution.corrected).length,
  });

  return {
    createdSkillIds,
    skillsToLink: skills
      .map((input) => {
        const resolution = resolutionByKey.get(input.normalizedName);
        const skill = resolution ? skillByInput.get(resolution.input) : undefined;
        return skill ? { input, skill: { id: skill.id } } : null;
      })
      .filter((value): value is { input: NormalizedEmployeeSkillInput; skill: { id: string } } => Boolean(value)),
  };
}

function buildEmployeeSkillLinkRows(
  employeeId: string,
  skillsToLink: ResolvedEmployeeSkillsResult["skillsToLink"]
) {
  const rowsBySkillId = new Map<
    string,
    {
      id: string;
      employee_id: string;
      skill_id: string;
      proficiency_level: number;
      years_of_experience: number | null;
      created_at: string;
    }
  >();
  const createdAt = new Date().toISOString();

  for (const { input, skill } of skillsToLink) {
    if (!skill.id) {
      throw new AppError("Resolved skill is missing a valid id.", 500, true, {
        cause: skill,
      });
    }

    rowsBySkillId.set(skill.id, {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      skill_id: skill.id,
      proficiency_level: input.proficiencyLevel,
      years_of_experience: input.yearsOfExperience,
      created_at: createdAt,
    });
  }

  return [...rowsBySkillId.values()];
}

async function replaceEmployeeSkillLinks(
  employeeId: string,
  linkRows: ReturnType<typeof buildEmployeeSkillLinkRows>
) {
  const { error: deleteError } = await supabase
    .from("employee_skills")
    .delete()
    .eq("employee_id", employeeId);

  if (deleteError) {
    throw createSkillProvisioningError(
      "Unable to update employee skills.",
      "delete_existing_employee_skills",
      deleteError,
      {
        employeeId,
      }
    );
  }

  if (linkRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("employee_skills")
    .upsert(linkRows, { onConflict: "employee_id,skill_id", ignoreDuplicates: true });

  if (insertError) {
    throw createSkillProvisioningError(
      "Unable to assign employee skills.",
      "upsert_employee_skills",
      insertError,
      {
        employeeId,
        linkRowCount: linkRows.length,
      }
    );
  }
}

export async function listApprovedSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select(
      "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
    )
    .eq("is_approved", true)
    .is("organization_id", null)
    .order("name", { ascending: true })
    .returns<SkillRow[]>();

  if (error) {
    throw new AppError("Unable to fetch approved skills.", 500);
  }

  return (data ?? []).map(mapSkill);
}

export async function listApprovedSkillsForOrganization(organizationId: string) {
  const [globalSkillsResult, organizationSkillsResult] = await Promise.all([
    supabase
      .from("skills")
      .select(
        "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
      )
      .eq("is_approved", true)
      .is("organization_id", null)
      .returns<SkillRow[]>(),
    supabase
      .from("skills")
      .select(
        "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
      )
      .eq("is_approved", true)
      .eq("organization_id", organizationId)
      .returns<SkillRow[]>(),
  ]);

  if (globalSkillsResult.error || organizationSkillsResult.error) {
    throw new AppError("Unable to fetch approved skills.", 500);
  }

  return [...(globalSkillsResult.data ?? []), ...(organizationSkillsResult.data ?? [])]
    .sort((left, right) => {
      const categoryComparison = (left.category ?? "").localeCompare(right.category ?? "");

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return left.name.localeCompare(right.name);
    })
    .map(mapSkill);
}

export async function listPublicApprovedSkills(
  query: PublicApprovedSkillsQuery = {}
) {
  let request = supabase
    .from("skills")
    .select(
      "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
    )
    .eq("is_approved", true)
    .is("organization_id", null)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (query.search) {
    request = request.or(
      `name.ilike.%${query.search}%,normalized_name.ilike.%${query.search}%`
    );
  }

  if (query.category) {
    request = request.eq("category", query.category);
  }

  const { data, error } = await request.returns<SkillRow[]>();

  if (error) {
    throw new AppError("Unable to fetch approved skills.", 500);
  }

  return (data ?? []).map(mapPublicSkill);
}

const SKILL_SELECT = "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at";

export interface PendingSkillResponse extends ReturnType<typeof mapSkill> {
  /** Other spellings people typed that resolve to this skill. */
  enteredAs: string[];
  employeeCount: number;
}

export async function listPendingSkills(): Promise<PendingSkillResponse[]> {
  const { data, error } = await supabase
    .from("skills")
    .select(SKILL_SELECT)
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .returns<SkillRow[]>();

  if (error) {
    throw new AppError("Unable to fetch pending skills.", 500);
  }

  const skillIds = (data ?? []).map((skill) => skill.id);
  const aliasesBySkill = new Map<string, string[]>();
  const countsBySkill = new Map<string, number>();

  if (skillIds.length > 0) {
    const [aliasesResult, linksResult] = await Promise.all([
      supabase
        .from("skill_aliases")
        .select("alias_key, skill_id")
        .in("skill_id", skillIds)
        .returns<Array<{ alias_key: string; skill_id: string }>>(),
      supabase
        .from("employee_skills")
        .select("skill_id")
        .in("skill_id", skillIds)
        .returns<Array<{ skill_id: string }>>(),
    ]);

    if (aliasesResult.error || linksResult.error) {
      throw new AppError("Unable to fetch pending skills.", 500);
    }

    for (const alias of aliasesResult.data ?? []) {
      aliasesBySkill.set(alias.skill_id, [...(aliasesBySkill.get(alias.skill_id) ?? []), alias.alias_key]);
    }
    for (const link of linksResult.data ?? []) {
      countsBySkill.set(link.skill_id, (countsBySkill.get(link.skill_id) ?? 0) + 1);
    }
  }

  return (data ?? []).map((skill) => ({
    ...mapSkill(skill),
    enteredAs: aliasesBySkill.get(skill.id) ?? [],
    employeeCount: countsBySkill.get(skill.id) ?? 0,
  }));
}

export interface ApproveSkillInput {
  name?: string;
  category?: string;
}

/**
 * Adds a pending skill to the catalog, optionally with a corrected name and category.
 * If the corrected name is already a stored skill, the pending one is merged into it.
 */
export async function approveSkill(skillId: string, input: ApproveSkillInput = {}) {
  const { data: pending, error: pendingError } = await supabase
    .from("skills")
    .select(SKILL_SELECT)
    .eq("id", skillId)
    .maybeSingle<SkillRow>();

  if (pendingError) throw new AppError("Unable to approve skill.", 500);
  if (!pending) throw new AppError("Skill not found.", 404);

  const name = input.name === undefined ? pending.name : input.name.replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_SKILL_NAME_LENGTH || !skillMatchKey(name)) {
    throw new AppError(`Skill name must be 1-${MAX_SKILL_NAME_LENGTH} characters and include letters or digits.`, 400);
  }
  if (input.category !== undefined && !isSkillCategory(input.category)) {
    throw new AppError("Skill category is not recognised.", 400);
  }
  const category = input.category ?? pending.category;
  const key = skillMatchKey(name);

  if (key !== pending.normalized_name) {
    const { data: target } = await supabase
      .from("skills")
      .select(SKILL_SELECT)
      .is("organization_id", null)
      .eq("normalized_name", key)
      .neq("id", skillId)
      .maybeSingle<SkillRow>();

    if (target) {
      await mergeSkillInto(pending.id, target.id);
      await rememberSkillAlias(pending.name, target.id, "admin");
      const { data: approvedTarget, error } = await supabase
        .from("skills")
        .update({ is_approved: true, category: target.category ?? category })
        .eq("id", target.id)
        .select(SKILL_SELECT)
        .single<SkillRow>();
      if (error || !approvedTarget) throw new AppError("Unable to approve skill.", 500);
      return mapSkill(approvedTarget);
    }
  }

  const { data, error } = await supabase
    .from("skills")
    .update({ is_approved: true, name, normalized_name: key, category })
    .eq("id", skillId)
    .select(SKILL_SELECT)
    .single<SkillRow>();

  if (error || !data) {
    throw new AppError("Unable to approve skill.", 400);
  }

  if (key !== pending.normalized_name) await rememberSkillAlias(pending.name, data.id, "admin");

  return mapSkill(data);
}

/** Moves every employee link and alias from one skill to another, then deletes the source. */
export async function mergeSkillInto(sourceSkillId: string, targetSkillId: string) {
  const { data: sourceLinks, error: sourceError } = await supabase
    .from("employee_skills")
    .select("id, employee_id")
    .eq("skill_id", sourceSkillId)
    .returns<Array<{ id: string; employee_id: string }>>();
  if (sourceError) throw new AppError("Unable to merge skills.", 500);

  const employeeIds = (sourceLinks ?? []).map((link) => link.employee_id);
  const alreadyLinked = new Set<string>();
  if (employeeIds.length > 0) {
    const { data: targetLinks, error } = await supabase
      .from("employee_skills")
      .select("employee_id")
      .eq("skill_id", targetSkillId)
      .in("employee_id", employeeIds)
      .returns<Array<{ employee_id: string }>>();
    if (error) throw new AppError("Unable to merge skills.", 500);
    for (const link of targetLinks ?? []) alreadyLinked.add(link.employee_id);
  }

  // An employee who already has the target skill keeps that link; the duplicate goes.
  const duplicateIds = (sourceLinks ?? []).filter((link) => alreadyLinked.has(link.employee_id)).map((link) => link.id);
  if (duplicateIds.length > 0) {
    const { error } = await supabase.from("employee_skills").delete().in("id", duplicateIds);
    if (error) throw new AppError("Unable to merge skills.", 500);
  }

  const { error: moveError } = await supabase.from("employee_skills").update({ skill_id: targetSkillId }).eq("skill_id", sourceSkillId);
  if (moveError) throw new AppError("Unable to merge skills.", 500);

  const { error: aliasError } = await supabase.from("skill_aliases").update({ skill_id: targetSkillId }).eq("skill_id", sourceSkillId);
  if (aliasError) throw new AppError("Unable to merge skills.", 500);

  const { error: deleteError } = await supabase.from("skills").delete().eq("id", sourceSkillId);
  if (deleteError) throw new AppError("Unable to merge skills.", 500);
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
    .select(
      "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
    )
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
    .select(
      "id, name, normalized_name, organization_id, is_approved, created_by, category, created_at"
    )
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
  skills: string[],
  organizationId?: string
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

  if (uniqueSkillNames.length === 0) {
    const { error: deleteError } = await supabase
      .from("employee_skills")
      .delete()
      .eq("employee_id", employeeId);

    if (deleteError) {
      throw createSkillProvisioningError(
        "Unable to update employee skills.",
        "delete_existing_employee_skills",
        deleteError,
        {
          employeeId,
        }
      );
    }

    return;
  }

  const resolvedSkills = await resolveEmployeeSkills(
    appUserId,
    uniqueSkillNames.map((skill) => ({
      name: skill.name,
      normalizedName: skill.normalizedName,
      proficiencyLevel: DEFAULT_PROFICIENCY_LEVEL,
      yearsOfExperience: null,
    })),
    organizationId
  );

  if (resolvedSkills.skillsToLink.length === 0) {
    return;
  }

  const linkRows = buildEmployeeSkillLinkRows(
    employeeId,
    resolvedSkills.skillsToLink.map(({ input, skill }) => ({
      input: {
        ...input,
        proficiencyLevel:
          currentSkillById.get(skill.id)?.proficiency_level ?? DEFAULT_PROFICIENCY_LEVEL,
        yearsOfExperience:
          currentSkillById.get(skill.id)?.years_of_experience ?? null,
      },
      skill,
    }))
  );

  await replaceEmployeeSkillLinks(employeeId, linkRows);
}

export async function replaceEmployeeSkillsWithDetails(
  employeeId: string,
  appUserId: string,
  skills: EmployeeSkillInput[],
  organizationId?: string
): Promise<ReplaceEmployeeSkillsResult> {
  const uniqueSkillInputs = uniqueDetailedSkills(skills);

  if (uniqueSkillInputs.length === 0) {
    await replaceEmployeeSkillLinks(employeeId, []);
    return {
      createdSkillIds: [],
      linkedSkillIds: [],
    };
  }

  const resolvedSkills = await resolveEmployeeSkills(
    appUserId,
    uniqueSkillInputs,
    organizationId
  );

  if (resolvedSkills.skillsToLink.length === 0) {
    return {
      createdSkillIds: resolvedSkills.createdSkillIds,
      linkedSkillIds: [],
    };
  }

  const linkRows = buildEmployeeSkillLinkRows(
    employeeId,
    resolvedSkills.skillsToLink
  );

  await replaceEmployeeSkillLinks(employeeId, linkRows);

  return {
    createdSkillIds: resolvedSkills.createdSkillIds,
    linkedSkillIds: linkRows.map((row) => row.skill_id),
  };
}
