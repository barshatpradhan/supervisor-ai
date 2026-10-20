import { GoogleGenAI } from "@google/genai";
import {
  isSkillCategory,
  MAX_SKILL_NAME_LENGTH,
  SKILL_CATEGORIES,
  skillMatchKey,
  type SkillCategory,
} from "../../utils/skillNames.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_INPUTS_PER_CALL = 25;

export type SkillVerdict =
  | { input: string; verdict: "match"; catalogName: string }
  | { input: string; verdict: "new"; name: string; category: SkillCategory }
  | { input: string; verdict: "invalid"; reason: string };

export interface CatalogEntry {
  name: string;
  category: string | null;
}

function buildPrompt(inputs: string[], catalog: CatalogEntry[]) {
  return [
    "You normalise skill names for a staffing app. For each user-typed skill, decide one verdict:",
    '- "match": it means the same thing as a catalog skill (synonym, abbreviation, typo, different',
    "  spelling or casing). Return that catalog name exactly as written in the catalog.",
    '- "new": a real, specific professional skill, tool, technology or method that is not in the',
    "  catalog. Return its official name with correct casing and punctuation (e.g. \"Apache Kafka\",",
    '  "GraphQL", "Kotlin Multiplatform") and one category from the list.',
    '- "invalid": not a professional skill: random letters, a person, company or job title, a',
    "  sentence, profanity, or too vague (\"stuff\", \"computers\"). Give a short reason.",
    "Prefer \"match\" when a catalog skill is the same thing. Do not match a broader or narrower",
    "skill (\"Kubernetes operators\" is new, not Kubernetes).",
    "",
    `Categories: ${SKILL_CATEGORIES.join(" | ")}`,
    "",
    "Catalog (name | category):",
    ...catalog.map((entry) => `${entry.name} | ${entry.category ?? "Other"}`),
    "",
    "Inputs (JSON array):",
    JSON.stringify(inputs),
    "",
    'Respond with only a JSON array, one object per input in the same order:',
    '[{"input": string, "verdict": "match" | "new" | "invalid", "catalogName"?: string, "name"?: string, "category"?: string, "reason"?: string}]',
  ].join("\n");
}

/**
 * Validates the model output. Anything malformed for an input yields no verdict for it,
 * so the caller falls back instead of storing a bad name.
 */
export function parseSkillVerdicts(raw: unknown, inputs: string[], catalog: CatalogEntry[]): Map<string, SkillVerdict> {
  const verdicts = new Map<string, SkillVerdict>();
  if (!Array.isArray(raw)) return verdicts;

  const catalogByName = new Map(catalog.map((entry) => [entry.name, entry.name]));
  const catalogByKey = new Map(catalog.map((entry) => [skillMatchKey(entry.name), entry.name]));
  const wanted = new Set(inputs);

  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const value = item as Record<string, unknown>;
    // Trust the echoed input when it is one we asked about; otherwise use the position.
    const input = typeof value.input === "string" && wanted.has(value.input) ? value.input : inputs[index];
    if (!input || verdicts.has(input)) return;

    if (value.verdict === "match" && typeof value.catalogName === "string") {
      const catalogName = catalogByName.get(value.catalogName) ?? catalogByKey.get(skillMatchKey(value.catalogName));
      if (catalogName) verdicts.set(input, { input, verdict: "match", catalogName });
      return;
    }

    if (value.verdict === "new" && typeof value.name === "string") {
      const name = value.name.replace(/\s+/g, " ").trim();
      if (!name || name.length > MAX_SKILL_NAME_LENGTH || skillMatchKey(name) === "") return;
      // The model sometimes calls an existing skill "new"; treat it as a match.
      const existing = catalogByKey.get(skillMatchKey(name));
      if (existing) {
        verdicts.set(input, { input, verdict: "match", catalogName: existing });
        return;
      }
      const category = isSkillCategory(value.category) ? value.category : "Other";
      verdicts.set(input, { input, verdict: "new", name, category });
      return;
    }

    if (value.verdict === "invalid") {
      const reason = typeof value.reason === "string" && value.reason.trim() ? value.reason.trim().slice(0, 160) : "Not a recognised skill.";
      verdicts.set(input, { input, verdict: "invalid", reason });
    }
  });

  return verdicts;
}

/**
 * Asks Gemini to match, correct or reject skill names. Returns null when Gemini is not
 * configured or fails; callers must then fall back to rule-based handling.
 */
export async function verifySkillNamesWithAi(inputs: string[], catalog: CatalogEntry[]): Promise<Map<string, SkillVerdict> | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || inputs.length === 0) return null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const client = new GoogleGenAI({ apiKey });
  const verdicts = new Map<string, SkillVerdict>();

  try {
    for (let start = 0; start < inputs.length; start += MAX_INPUTS_PER_CALL) {
      const batch = inputs.slice(start, start + MAX_INPUTS_PER_CALL);
      const response = await client.models.generateContent({
        model,
        contents: buildPrompt(batch, catalog),
        config: { temperature: 0, responseMimeType: "application/json" },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty response");
      for (const [input, verdict] of parseSkillVerdicts(JSON.parse(text), batch, catalog)) verdicts.set(input, verdict);
    }
    console.info(JSON.stringify({ scope: "skill_verification", event: "ai_verified", inputCount: inputs.length, verdictCount: verdicts.size }));
    return verdicts;
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status;
    console.warn(
      JSON.stringify({
        scope: "skill_verification",
        event: "ai_unavailable",
        errorType: error instanceof Error ? error.name : "unknown",
        status: typeof status === "number" ? status : undefined,
      })
    );
    return null;
  }
}
