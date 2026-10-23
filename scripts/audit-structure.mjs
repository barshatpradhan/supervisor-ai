#!/usr/bin/env node
// audit-structure.mjs: read-only static audit of a TS/React source tree.
//
// Usage (from the repo root):
//   node scripts/audit-structure.mjs frontend/src > audit-frontend.md
//   node scripts/audit-structure.mjs backend/src  > audit-backend.md
// Optional 2nd argument: path alias prefix (default "@", meaning "@/x" -> <root>/x).
//
// It builds an import graph with regexes (no TypeScript compiler), so treat every result as a
// CANDIDATE to verify by hand: dynamic imports with variables, string-built paths, config files
// and framework conventions are invisible to it.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "frontend/src");
const alias = process.argv[3] ?? "@";
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const SHARED_LAYERS = new Set(["components", "hooks", "services", "lib", "utils", "types", "layouts", "config"]);
const KEEP_SHARED = /^(components\/(ui|layout|shared)|lib\/api)\//; // genuinely shared by design
const ENTRY = /(^|\/)(main|server|vite-env\.d|express\.d)\.tsx?$|\.d\.ts$|\.config\.[tj]s$|(^|\/)scripts\//;
const isTest = (f) => /\.(test|spec)\.[tj]sx?$/.test(f) || /(^|\/)__tests__\//.test(f);

if (!fs.existsSync(root)) {
  console.error(`Not found: ${root}`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(root);
const fileSet = new Set(files);
const rel = (f) => path.relative(root, f).split(path.sep).join("/");

function tryResolve(base) {
  const cands = [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, "index" + e))];
  if (/\.m?js$/.test(base)) cands.push(base.replace(/\.m?js$/, ".ts"), base.replace(/\.m?js$/, ".tsx"));
  return cands.find((c) => fileSet.has(c));
}
function resolveSpec(from, spec) {
  if (spec.startsWith(".")) return tryResolve(path.resolve(path.dirname(from), spec));
  if (spec.startsWith(alias + "/")) return tryResolve(path.join(root, spec.slice(alias.length + 1)));
  return undefined; // package import
}

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|vi\.mock\(\s*["']([^"']+)["']/g;

const prodImporters = new Map(files.map((f) => [f, new Set()]));
const testImporters = new Map(files.map((f) => [f, new Set()]));
const imports = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const targets = new Set();
  for (const m of src.matchAll(IMPORT_RE)) {
    const t = resolveSpec(f, m[1] ?? m[2] ?? m[3]);
    if (t && t !== f) targets.add(t);
  }
  imports.set(f, targets);
  for (const t of targets) (isTest(f) ? testImporters : prodImporters).get(t).add(f);
}

const layer = (f) => rel(f).split("/")[0];
const featureOf = (f) => {
  const p = rel(f).split("/");
  return p[0] === "features" ? p[1] : null;
};
const prod = files.filter((f) => !isTest(f));
const out = [];
const section = (title, rows, note) => {
  out.push(`\n## ${title} (${rows.length})`);
  if (note) out.push(`_${note}_\n`);
  out.push(rows.length ? rows.map((r) => `- ${r}`).join("\n") : "- none");
};

out.push(`# Structure audit: ${rel(root) || root}`);
out.push(`${files.length} source files, ${prod.length} non-test. Heuristic output: verify before deleting or moving.`);

// 1. Unused files
const unused = prod.filter((f) => !ENTRY.test(rel(f)) && prodImporters.get(f).size === 0);
section(
  "1. Files nothing imports",
  unused.map((f) => {
    const t = testImporters.get(f).size;
    return `\`${rel(f)}\`${t ? ` (only imported by ${t} test file${t > 1 ? "s" : ""}: dead in production)` : ""}`;
  }),
  "Includes re-export shims and old copies. Entry points, .d.ts and config files are excluded.",
);

// 2. Shared-layer files used by exactly one feature
const single = [];
for (const f of prod) {
  const r = rel(f);
  if (featureOf(f) || !SHARED_LAYERS.has(layer(f)) || KEEP_SHARED.test(r)) continue;
  const users = [...prodImporters.get(f)];
  if (!users.length) continue;
  const feats = new Set(users.map(featureOf));
  if (feats.size === 1 && !feats.has(null)) single.push(`\`${r}\` -> move to \`features/${[...feats][0]}/\` (${users.length} importer${users.length > 1 ? "s" : ""})`);
}
section("2. Shared files used by only one feature", single, "Candidates to move into that feature's folder.");

// 3. Feature files used by other features
const promote = [];
for (const f of prod) {
  const own = featureOf(f);
  if (!own) continue;
  const others = new Set([...prodImporters.get(f)].map(featureOf).filter((x) => x && x !== own));
  if (others.size >= 2) promote.push(`\`${rel(f)}\` is used by ${[...others].join(", ")} -> consider promoting to a shared folder`);
  else if (others.size === 1 && ![...prodImporters.get(f)].some((u) => featureOf(u) === own))
    promote.push(`\`${rel(f)}\` is used only by \`${[...others][0]}\` -> may belong there`);
}
section("3. Feature files used outside their feature", promote);

// 4. Cross-feature coupling
const pairs = new Map();
for (const f of prod) {
  const a = featureOf(f);
  if (!a) continue;
  for (const t of imports.get(f)) {
    const b = featureOf(t);
    if (b && b !== a) pairs.set(`${a} -> ${b}`, (pairs.get(`${a} -> ${b}`) ?? 0) + 1);
  }
}
section("4. Cross-feature imports", [...pairs].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}: ${v} import${v > 1 ? "s" : ""}`), "High counts suggest shared code living in the wrong place.");

// 5. Types placement
const hasRuntime = (f) => /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|enum)\b/.test(fs.readFileSync(f, "utf8"));
const typeFiles = prod.filter((f) => /(^|\/)types\//.test(rel(f)) || /\.types\.tsx?$/.test(f) || !hasRuntime(f));
const typeRows = [];
for (const f of typeFiles) {
  const users = [...prodImporters.get(f)];
  if (!users.length) continue;
  const feats = new Set(users.map(featureOf));
  const where = featureOf(f);
  if (where && [...feats].filter((x) => x && x !== where).length >= 2) typeRows.push(`\`${rel(f)}\` (in feature \`${where}\`) is imported by ${[...feats].filter(Boolean).join(", ")} -> move to the shared \`types/\` folder`);
  else if (!where && layer(f) === "types" && feats.size === 1 && !feats.has(null)) typeRows.push(`\`${rel(f)}\` is only used by \`${[...feats][0]}\` -> move into that feature's \`types/\``);
}
section("5. Type files in the wrong place", typeRows);

// 6. Tests
const tests = files.filter(isTest);
const testRows = [];
for (const t of tests) {
  const base = rel(t).replace(/\.(test|spec)(\.[tj]sx?)$/, "$2");
  const sibling = files.find((f) => !isTest(f) && rel(f).replace(/\.[tj]sx?$/, "") === base.replace(/\.[tj]sx?$/, ""));
  const subjects = [...imports.get(t)].filter((f) => !isTest(f));
  if (!subjects.length) testRows.push(`\`${rel(t)}\` imports no source file from this tree (tests nothing local?)`);
  else if (!sibling) testRows.push(`\`${rel(t)}\` has no sibling file; it tests ${subjects.slice(0, 3).map((s) => "`" + rel(s) + "`").join(", ")}`);
}
section("6. Test files to review", testRows, "Not colocated with their subject, or testing nothing local.");
out.push(`\nTotals: ${tests.length} test files. Source files with no test importing them: ${prod.filter((f) => !ENTRY.test(rel(f)) && testImporters.get(f).size === 0 && /(services|utils|hooks)\//.test(rel(f))).length} (services, utils, hooks only).`);

console.log(out.join("\n"));
