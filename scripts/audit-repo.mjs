#!/usr/bin/env node
// audit-repo.mjs: read-only audit of repo layout, risky files and branch merge status.
//
// Usage (from the repo root):
//   node scripts/audit-repo.mjs                 # fetches origin first, compares against origin/main
//   node scripts/audit-repo.mjs --no-fetch      # skip the fetch
//   node scripts/audit-repo.mjs --base=origin/main > audit-repo.md
//
// It never changes anything: no deletes, no checkouts, no pushes. It only prints suggestions.
// Exit code 1 means at least one branch has work that is not in the base branch.

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("--base=")) ?? "--base=origin/main").slice(7);
const fetchFirst = !args.includes("--no-fetch");

// Edit these to match the layout you want to enforce.
const EXPECTED_TOP = new Set([
  "backend", "frontend", "supabase", "docs", "scripts", ".github", ".gitignore", ".gitattributes",
  "README.md", "CLAUDE.md", "CODEX.md", "docker-compose.yml", "LICENSE", ".git", ".claude", ".vscode",
]);
const EXPECTED_IN = {
  backend: new Set(["src", "tests", "scripts", "package.json", "package-lock.json", "tsconfig.json", "Dockerfile", ".env.example", "README.md", "CLAUDE.md", "CODEX.md", "knip.json", "node_modules", "dist", ".env", ".dockerignore", ".gitignore", "eslint.config.js"]),
  frontend: new Set(["src", "tests", "public", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "vite.config.ts", "index.html", ".env.example", "README.md", "CLAUDE.md", "CODEX.md", "knip.json", "node_modules", "dist", ".env", ".gitignore", "eslint.config.js", "vercel.json"]),
};
const RISKY = [/\.dump$/i, /\.diff$/i, /\.patch$/i, /(^|\/)\.env(\..*)?$/i, /key.*\.txt$/i, /smpt|smtp.*key/i, /password/i, /secret/i, /backup.*\.sql$/i, /\.(pem|p12|pfx)$/i, /\.(mp4|mov|mp3|wav)$/i];
const RISKY_OK = /\.env\.example$/i;

function git(...a) {
  return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).trim();
}
function tryGit(...a) {
  try { return git(...a); } catch { return null; }
}

if (tryGit("rev-parse", "--is-inside-work-tree") !== "true") {
  console.error("Run this inside a git repository.");
  process.exit(2);
}
const root = git("rev-parse", "--show-toplevel");
process.chdir(root);
if (fetchFirst) tryGit("fetch", "--prune", "origin");
if (tryGit("rev-parse", "--verify", base) === null) {
  console.error(`Base ref ${base} not found. Use --base=<ref>.`);
  process.exit(2);
}

const out = [];
const section = (t) => out.push(`\n## ${t}`);

out.push(`# Repo audit`);
out.push(`Base: \`${base}\` at ${git("rev-parse", "--short", base)}. Current branch: \`${tryGit("branch", "--show-current") || "(detached)"}\`.`);

// 1. Working tree and stashes -------------------------------------------------------------------
section("1. Uncommitted work");
const porcelain = git("status", "--porcelain").split("\n").filter(Boolean);
const modified = porcelain.filter((l) => !l.startsWith("??"));
const untracked = porcelain.filter((l) => l.startsWith("??")).map((l) => l.slice(3));
out.push(modified.length ? modified.map((l) => `- changed: \`${l.slice(3)}\``).join("\n") : "- no modified tracked files");
out.push(untracked.length ? untracked.map((l) => `- untracked (not ignored): \`${l}\``).join("\n") : "- no untracked files");
const stashes = (tryGit("stash", "list") ?? "").split("\n").filter(Boolean);
out.push(stashes.length ? `- ${stashes.length} stash(es): ${stashes.map((s) => "`" + s + "`").join(", ")}` : "- no stashes");

// 2. Layout ---------------------------------------------------------------------------------------
section("2. Layout");
const tracked = git("ls-files").split("\n").filter(Boolean);
const others = (tryGit("ls-files", "--others", "--exclude-standard") ?? "").split("\n").filter(Boolean);
const topOf = (p) => p.split("/")[0];
const topNames = new Set([...tracked, ...others].map(topOf));
const unexpectedTop = [...topNames].filter((n) => !EXPECTED_TOP.has(n)).sort();
out.push(unexpectedTop.length ? "Unexpected top-level entries (move out of the repo, delete, or add to EXPECTED_TOP):\n" + unexpectedTop.map((n) => `- \`${n}\` (${tracked.some((p) => topOf(p) === n) ? "tracked" : "untracked"})`).join("\n") : "- top level matches the expected layout");
for (const pkg of Object.keys(EXPECTED_IN)) {
  const names = new Set([...tracked, ...others].filter((p) => p.startsWith(pkg + "/")).map((p) => p.split("/")[1]));
  const odd = [...names].filter((n) => !EXPECTED_IN[pkg].has(n)).sort();
  if (odd.length) out.push(`- \`${pkg}/\` has unexpected entries: ${odd.map((n) => "`" + n + "`").join(", ")}`);
}
// source-tree sanity: tests living inside src, and stray scripts
const testsInSrc = tracked.filter((p) => /^(backend|frontend)\/src\/.*\.(test|spec)\.[tj]sx?$/.test(p));
out.push(testsInSrc.length ? `- ${testsInSrc.length} test file(s) still inside src/ (e.g. \`${testsInSrc[0]}\`); skip this line if you colocate tests on purpose` : "- no test files inside src/");

// 3. Risky files ----------------------------------------------------------------------------------
section("3. Files that should not be in the repo");
const risky = [...new Set([...tracked.map((p) => [p, "tracked"]), ...others.map((p) => [p, "untracked"])].map(JSON.stringify))].map(JSON.parse)
  .filter(([p]) => RISKY.some((re) => re.test(p)) && !RISKY_OK.test(p));
out.push(risky.length ? risky.map(([p, s]) => `- \`${p}\` (${s})`).join("\n") : "- none matched the risky patterns");
out.push("_Tracked entries here are the serious ones: remove them from git and rotate anything secret they held. Patterns are broad on purpose; verify each._");

// 4. Local main vs origin/main --------------------------------------------------------------------
section("4. Local main");
if (tryGit("rev-parse", "--verify", "main") !== null) {
  const [behind, ahead] = git("rev-list", "--left-right", "--count", `${base}...main`).split(/\s+/).map(Number);
  out.push(ahead || behind ? `- local \`main\` is ${ahead} ahead and ${behind} behind \`${base}\`${ahead ? ": **unpushed commits on local main**" : ""}` : `- local \`main\` matches \`${base}\``);
} else out.push("- no local main branch");

// 5. Branches -------------------------------------------------------------------------------------
section("5. Branches vs " + base);
let prs = new Map();
try {
  const j = execFileSync("gh", ["pr", "list", "--state", "all", "--limit", "300", "--json", "number,headRefName,state"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  for (const p of JSON.parse(j)) prs.set(p.headRefName, p);
} catch { /* gh not installed or not logged in: squash merges will show as "check PR" */ }
out.push(prs.size ? "_Pull request states read through the GitHub CLI._" : "_GitHub CLI not available: squash-merged branches show as UNMERGED or CHECK PR. Run `gh auth login` for exact results._");

const rows = git("for-each-ref", "--format=%(refname:short)|%(committerdate:short)|%(subject)", "refs/heads", "refs/remotes").split("\n").filter(Boolean)
  .map((l) => { const [ref, date, ...s] = l.split("|"); return { ref, date, subject: s.join("|") }; })
  .filter((r) => r.ref !== base && r.ref !== "origin" && !r.ref.endsWith("/HEAD") && r.ref !== "main" && r.ref !== "origin/main");

let unmerged = 0;
const table = [];
const deletable = []; // local branches whose work is already in base: [ref, needsForce]
function sameFilesAsBase(ref) {
  const mb = tryGit("merge-base", base, ref);
  const files = mb ? (tryGit("diff", "--name-only", mb, ref) ?? "").split("\n").filter(Boolean) : [];
  if (!files.length || files.length > 200) return false;
  try { execFileSync("git", ["diff", "--quiet", base, ref, "--", ...files], { stdio: "ignore" }); return true; } catch { return false; }
}
for (const r of rows) {
  const ahead = Number(git("rev-list", "--count", `${base}..${r.ref}`));
  const behind = Number(git("rev-list", "--count", `${r.ref}..${base}`));
  const plus = (tryGit("cherry", base, r.ref) ?? "").split("\n").filter((l) => l.startsWith("+")).length;
  const name = r.ref.replace(/^origin\//, "");
  const pr = prs.get(name);
  const isLocal = !r.ref.startsWith("origin/");
  let status;
  if (ahead === 0) { status = "merged"; if (isLocal) deletable.push([r.ref, false]); }
  else if (plus === 0) { status = "merged (same changes already in base)"; if (isLocal) deletable.push([r.ref, true]); }
  else if (pr?.state === "MERGED") { status = `merged via PR #${pr.number} (squash)`; if (isLocal) deletable.push([r.ref, true]); }
  else if (pr?.state === "OPEN") { status = `OPEN PR #${pr.number}`; unmerged++; }
  else if (pr?.state === "CLOSED") { status = `PR #${pr.number} closed, NOT merged`; unmerged++; }
  else if (sameFilesAsBase(r.ref)) { status = "likely squash-merged (its files match base)"; if (isLocal) deletable.push([r.ref, true]); }
  else { status = prs.size ? "UNMERGED, no PR" : "UNMERGED or squash-merged: check PR"; unmerged++; }
  table.push(`| \`${r.ref}\` | ${status} | ${ahead} | ${behind} | ${r.date} | ${r.subject.slice(0, 60).replace(/\|/g, "/")} |`);
}
out.push("\n| Branch | Status | Ahead | Behind | Last commit | Subject |\n| --- | --- | --- | --- | --- | --- |\n" + (table.join("\n") || "| none | | | | | |"));

if (deletable.length) {
  out.push("\nLocal branches whose work is already in base. Review, then run yourself (I never delete anything). `-D` is needed for squash merges because git cannot see them as merged:\n```\n" + deletable.map(([ref, force]) => `git branch ${force ? "-D" : "-d"} ${ref}`).join("\n") + "\n```");
}
out.push(`\nSummary: ${rows.length} branch(es) checked, ${unmerged} with work not in \`${base}\`.`);

console.log(out.join("\n"));
process.exit(unmerged ? 1 : 0);
