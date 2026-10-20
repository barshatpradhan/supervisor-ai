/**
 * One-time cleanup of stored skills with the same AI check used when people type skills.
 * Run after supabase/migrations/202610210001_global_skill_catalog.sql.
 *
 *   npm run skills:cleanup               dry run: prints the plan, writes nothing
 *   npm run skills:cleanup -- --confirm  applies it
 *
 * For every skill outside the categorised catalog:
 * - same thing as a catalog skill -> merged into it (employee links move; old spelling kept as an alias)
 * - a real skill                  -> renamed to its proper name and categorised (approval unchanged)
 * - not a skill                   -> sent back to the platform admin queue (is_approved = false); never deleted
 */
import { supabase } from "../../src/config/supabase.js";
import { verifySkillNamesWithAi } from "../../src/services/ai/skillVerification.service.js";
import { rememberSkillAlias } from "../../src/services/skillResolutionService.js";
import { mergeSkillInto } from "../../src/services/skillService.js";
import { skillMatchKey } from "../../src/utils/skillNames.js";

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  is_approved: boolean;
}

const apply = process.argv.includes("--confirm");

if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
  console.error("Refusing to run with NODE_ENV=production. Pass --allow-production if you really mean it.");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(process.env.SUPABASE_URL ?? "").host;
  } catch {
    return "<unset>";
  }
})();
console.log(`\nTarget Supabase project: ${host}`);
console.log(apply ? "Mode: APPLY (--confirm)\n" : "Mode: dry run (add --confirm to apply)\n");

const { data: skills, error } = await supabase
  .from("skills")
  .select("id, name, normalized_name, category, is_approved")
  .is("organization_id", null)
  .order("name")
  .returns<SkillRow[]>();
if (error) throw new Error(`Unable to load skills: ${error.message}`);

const catalog = (skills ?? []).filter((skill) => skill.category !== null && skill.is_approved);
const candidates = (skills ?? []).filter((skill) => !catalog.includes(skill));
console.log(`${catalog.length} catalog skills, ${candidates.length} to check.`);
if (candidates.length === 0) process.exit(0);

const verdicts = await verifySkillNamesWithAi(
  candidates.map((skill) => skill.name),
  catalog.map((skill) => ({ name: skill.name, category: skill.category }))
);
if (!verdicts) {
  console.error("\nThe AI check is unavailable (see the log line above). Nothing was changed; try again later.");
  process.exit(1);
}

const catalogByName = new Map(catalog.map((skill) => [skill.name, skill]));
const byKey = new Map((skills ?? []).map((skill) => [skill.normalized_name, skill]));
let changes = 0;

for (const skill of candidates) {
  const verdict = verdicts.get(skill.name);

  if (!verdict) {
    console.log(`  ?  ${skill.name}: no clear answer from the AI; left as is`);
    continue;
  }

  if (verdict.verdict === "match") {
    const target = catalogByName.get(verdict.catalogName);
    if (!target || target.id === skill.id) continue;
    console.log(`  →  ${skill.name}  merge into  ${target.name}`);
    changes += 1;
    if (apply) {
      await mergeSkillInto(skill.id, target.id);
      await rememberSkillAlias(skill.name, target.id, "admin");
    }
    continue;
  }

  if (verdict.verdict === "new") {
    const key = skillMatchKey(verdict.name);
    const clash = byKey.get(key);
    if (clash && clash.id !== skill.id) {
      console.log(`  →  ${skill.name}  merge into  ${clash.name} (same skill)`);
      changes += 1;
      if (apply) {
        await mergeSkillInto(skill.id, clash.id);
        await rememberSkillAlias(skill.name, clash.id, "admin");
        if (!clash.category) await supabase.from("skills").update({ category: verdict.category }).eq("id", clash.id);
      }
      continue;
    }
    if (verdict.name === skill.name && verdict.category === skill.category) continue;
    console.log(`  ✎  ${skill.name}  →  ${verdict.name}  [${verdict.category}]${skill.is_approved ? "" : " (still pending)"}`);
    changes += 1;
    if (apply) {
      const { error: updateError } = await supabase
        .from("skills")
        .update({ name: verdict.name, normalized_name: key, category: verdict.category })
        .eq("id", skill.id);
      if (updateError) throw new Error(`Unable to update ${skill.name}: ${updateError.message}`);
      if (key !== skill.normalized_name) await rememberSkillAlias(skill.name, skill.id, "admin");
    }
    byKey.delete(skill.normalized_name);
    byKey.set(key, { ...skill, name: verdict.name, normalized_name: key, category: verdict.category });
    continue;
  }

  console.log(`  ✗  ${skill.name}: ${verdict.reason}${skill.is_approved ? "  → back to the admin queue" : "  (already pending)"}`);
  if (skill.is_approved) {
    changes += 1;
    if (apply) {
      const { error: updateError } = await supabase.from("skills").update({ is_approved: false }).eq("id", skill.id);
      if (updateError) throw new Error(`Unable to unapprove ${skill.name}: ${updateError.message}`);
    }
  }
}

console.log(`\n${changes} change${changes === 1 ? "" : "s"} ${apply ? "applied" : "planned"}.`);
if (!apply && changes > 0) console.log("Re-run with --confirm to apply:\n  npm run skills:cleanup -- --confirm\n");
