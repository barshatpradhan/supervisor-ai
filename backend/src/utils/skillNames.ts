/**
 * Skill naming rules shared by matching, the catalog and recommendations.
 * skillMatchKey must match public.skill_match_key() in
 * supabase/migrations/202610210001_global_skill_catalog.sql.
 */

export const SKILL_CATEGORIES = [
  "Programming languages",
  "Frontend",
  "Backend",
  "Mobile",
  "Databases",
  "Cloud & DevOps",
  "Data & analytics",
  "AI & machine learning",
  "Testing & QA",
  "Security",
  "Design & UX",
  "Product & delivery",
  "Collaboration",
  "Other",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const MAX_SKILL_NAME_LENGTH = 60;

export function isSkillCategory(value: unknown): value is SkillCategory {
  return typeof value === "string" && (SKILL_CATEGORIES as readonly string[]).includes(value);
}

/** Dedupe key: "Node.js", "node js" and "NODEJS" are equal; "C", "C#" and "C++" are not. */
export function skillMatchKey(value: string) {
  return value.toLowerCase().replace(/\+/g, "plus").replace(/#/g, "sharp").replace(/[^a-z0-9]/g, "");
}

/** Collapses whitespace and stray punctuation around the name; keeps the user's casing. */
export function cleanSkillInput(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-–—/|]+|[\s,;:\-–—/|]+$/g, "")
    .trim()
    .slice(0, MAX_SKILL_NAME_LENGTH);
}

/**
 * A readable display name when no catalog entry or AI suggestion exists: all-lowercase words
 * are capitalised ("kubernetes operators" -> "Kubernetes Operators"); words with any capital
 * letter keep their casing ("iOS", "GraphQL").
 */
export function tidySkillName(value: string) {
  return cleanSkillInput(value)
    .split(" ")
    .map((word) => (word === word.toLowerCase() && /^[a-z]/.test(word) ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Cheap pre-AI check for obvious junk: needs letters, not one repeated character,
 * and not a long run of consonants like "asdfghjkl".
 */
export function looksLikeSkillName(value: string) {
  const cleaned = cleanSkillInput(value);
  const key = skillMatchKey(cleaned);
  if (key.length === 0 || !/[a-z]/i.test(cleaned)) return false;
  if (/^(.)\1+$/.test(key)) return false;
  if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(key)) return false;
  return true;
}
