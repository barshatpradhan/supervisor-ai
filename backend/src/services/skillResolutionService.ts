import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";
import { cleanSkillInput, looksLikeSkillName, skillMatchKey, tidySkillName } from "../utils/skillNames.js";
import { verifySkillNamesWithAi, type CatalogEntry } from "./ai/skillVerification.service.js";

export const MAX_SKILLS_PER_RESOLVE = 30;

export interface ResolvedSkillRef {
  id: string;
  name: string;
  category: string | null;
  isApproved: boolean;
}

/**
 * How one typed skill resolves:
 * - catalog: an approved skill (exact, alias or AI match). Used as is.
 * - pending: an existing skill still waiting for platform approval. Used as is.
 * - new: AI says it is a real skill that is not stored yet; saved as pending under suggestedName.
 * - unverified: AI was unavailable; saved as pending under a tidied name for the admin to check.
 * - invalid: not a skill. Never saved.
 */
export interface SkillResolution {
  input: string;
  status: "catalog" | "pending" | "new" | "unverified" | "invalid";
  skill: ResolvedSkillRef | null;
  suggestedName: string | null;
  category: string | null;
  /** True when what gets stored differs from what was typed. */
  corrected: boolean;
  reason: string | null;
  matchedBy: "exact" | "alias" | "ai" | "rule" | null;
}

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  is_approved: boolean;
}

const SKILL_COLUMNS = "id, name, normalized_name, category, is_approved";

function toRef(row: SkillRow): ResolvedSkillRef {
  return { id: row.id, name: row.name, category: row.category, isApproved: row.is_approved };
}

function fromSkill(input: string, row: SkillRow, matchedBy: SkillResolution["matchedBy"]): SkillResolution {
  return {
    input,
    status: row.is_approved ? "catalog" : "pending",
    skill: toRef(row),
    suggestedName: null,
    category: row.category,
    corrected: row.name !== input,
    reason: null,
    matchedBy,
  };
}

type KnownSkills = Map<string, { row: SkillRow; matchedBy: "exact" | "alias" }>;

async function loadSkillsByKeys(keys: string[]): Promise<KnownSkills> {
  if (keys.length === 0) return new Map();
  const [{ data: skills, error: skillsError }, { data: aliases, error: aliasesError }] = await Promise.all([
    supabase.from("skills").select(SKILL_COLUMNS).is("organization_id", null).in("normalized_name", keys).returns<SkillRow[]>(),
    supabase.from("skill_aliases").select(`alias_key, skills (${SKILL_COLUMNS})`).in("alias_key", keys).returns<Array<{ alias_key: string; skills: SkillRow | null }>>(),
  ]);
  if (skillsError || aliasesError) {
    throw new AppError("Unable to look up skills.", 500, true, { cause: skillsError ?? aliasesError });
  }

  const byKey: KnownSkills = new Map();
  for (const row of skills ?? []) byKey.set(row.normalized_name, { row, matchedBy: "exact" });
  for (const alias of aliases ?? []) {
    if (alias.skills && !byKey.has(alias.alias_key)) byKey.set(alias.alias_key, { row: alias.skills, matchedBy: "alias" });
  }
  return byKey;
}

async function loadApprovedCatalog(): Promise<Array<CatalogEntry & { row: SkillRow }>> {
  const { data, error } = await supabase
    .from("skills")
    .select(SKILL_COLUMNS)
    .is("organization_id", null)
    .eq("is_approved", true)
    .order("name")
    .returns<SkillRow[]>();
  if (error) throw new AppError("Unable to load the skill catalog.", 500, true, { cause: error });
  return (data ?? []).map((row) => ({ name: row.name, category: row.category, row }));
}

/** Remembers a spelling that resolved to a skill, so the next lookup needs no AI. */
export async function rememberSkillAlias(typed: string, skillId: string, source: "ai" | "admin") {
  const aliasKey = skillMatchKey(typed);
  if (!aliasKey) return;
  const { error } = await supabase.from("skill_aliases").upsert({ alias_key: aliasKey, skill_id: skillId, source }, { onConflict: "alias_key", ignoreDuplicates: true });
  if (error) {
    console.warn(JSON.stringify({ scope: "skill_verification", event: "alias_write_failed", code: error.code }));
  }
}

/**
 * Resolves typed skill names against the catalog, then AI for whatever is left.
 * Read-only apart from remembering aliases for AI matches.
 */
export async function resolveSkillNames(rawInputs: string[], options: { useAi?: boolean } = {}): Promise<SkillResolution[]> {
  const inputs = [...new Set(rawInputs.map(cleanSkillInput).filter(Boolean))].slice(0, MAX_SKILLS_PER_RESOLVE);
  const results = new Map<string, SkillResolution>();

  const known = await loadSkillsByKeys([...new Set(inputs.map(skillMatchKey).filter(Boolean))]);
  const unresolved: string[] = [];

  for (const input of inputs) {
    const hit = known.get(skillMatchKey(input));
    if (hit) {
      results.set(input, fromSkill(input, hit.row, hit.matchedBy));
    } else if (!looksLikeSkillName(input)) {
      results.set(input, {
        input,
        status: "invalid",
        skill: null,
        suggestedName: null,
        category: null,
        corrected: false,
        reason: "That does not look like a skill name.",
        matchedBy: "rule",
      });
    } else {
      unresolved.push(input);
    }
  }

  if (unresolved.length > 0) {
    const catalog = options.useAi === false ? [] : await loadApprovedCatalog();
    const verdicts = options.useAi === false ? null : await verifySkillNamesWithAi(unresolved, catalog);
    const catalogByName = new Map(catalog.map((entry) => [entry.name, entry.row]));
    const newKeys = [...verdicts?.values() ?? []]
      .filter((verdict) => verdict.verdict === "new")
      .map((verdict) => skillMatchKey(verdict.verdict === "new" ? verdict.name : ""));
    const existingForNew = await loadSkillsByKeys([...new Set(newKeys)]);

    for (const input of unresolved) {
      const verdict = verdicts?.get(input);
      if (verdict?.verdict === "match") {
        const row = catalogByName.get(verdict.catalogName);
        if (row) {
          results.set(input, fromSkill(input, row, "ai"));
          await rememberSkillAlias(input, row.id, "ai");
          continue;
        }
      }
      if (verdict?.verdict === "new") {
        const existing = existingForNew.get(skillMatchKey(verdict.name));
        if (existing) {
          results.set(input, fromSkill(input, existing.row, "ai"));
          await rememberSkillAlias(input, existing.row.id, "ai");
          continue;
        }
        results.set(input, {
          input,
          status: "new",
          skill: null,
          suggestedName: verdict.name,
          category: verdict.category,
          corrected: verdict.name !== input,
          reason: null,
          matchedBy: "ai",
        });
        continue;
      }
      if (verdict?.verdict === "invalid") {
        results.set(input, {
          input,
          status: "invalid",
          skill: null,
          suggestedName: null,
          category: null,
          corrected: false,
          reason: verdict.reason,
          matchedBy: "ai",
        });
        continue;
      }
      const suggestedName = tidySkillName(input);
      results.set(input, {
        input,
        status: "unverified",
        skill: null,
        suggestedName,
        category: null,
        corrected: suggestedName !== input,
        reason: null,
        matchedBy: null,
      });
    }
  }

  return inputs.map((input) => results.get(input) as SkillResolution);
}

/**
 * Stores "new" and "unverified" resolutions as pending skills (or reuses one created
 * concurrently) and returns the skill each input maps to. Invalid inputs are rejected.
 */
export async function materializeSkillResolutions(resolutions: SkillResolution[], createdByUserId: string) {
  const invalid = resolutions.filter((resolution) => resolution.status === "invalid");
  if (invalid.length > 0) {
    throw new AppError(
      `${invalid.map((resolution) => `"${resolution.input}"`).join(", ")} ${invalid.length === 1 ? "is not" : "are not"} a recognised skill. Remove or correct ${invalid.length === 1 ? "it" : "them"}.`,
      400
    );
  }

  const skillByInput = new Map<string, ResolvedSkillRef>();
  const createdSkillIds: string[] = [];

  for (const resolution of resolutions) {
    if (resolution.skill) {
      skillByInput.set(resolution.input, resolution.skill);
      continue;
    }

    const name = resolution.suggestedName ?? tidySkillName(resolution.input);
    const key = skillMatchKey(name);
    const { data, error } = await supabase
      .from("skills")
      .insert({
        name,
        normalized_name: key,
        organization_id: null,
        is_approved: false,
        category: resolution.category,
        created_by: createdByUserId,
      })
      .select(SKILL_COLUMNS)
      .single<SkillRow>();

    let row = data;
    if (error?.code === "23505") {
      // Someone saved the same new skill a moment ago: reuse it.
      const { data: existing } = await supabase.from("skills").select(SKILL_COLUMNS).is("organization_id", null).eq("normalized_name", key).maybeSingle<SkillRow>();
      row = existing;
    } else if (error) {
      throw new AppError("Unable to save the new skill.", 500, true, { cause: error });
    } else if (data) {
      createdSkillIds.push(data.id);
    }
    if (!row) throw new AppError("Unable to save the new skill.", 500);

    skillByInput.set(resolution.input, toRef(row));
    if (skillMatchKey(resolution.input) !== key) await rememberSkillAlias(resolution.input, row.id, "ai");
  }

  return { createdSkillIds, skillByInput };
}
