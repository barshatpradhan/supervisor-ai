# Audit tools

Two read-only Node scripts in `scripts/` for checking the repository before cleanups and merges.
Neither changes, moves, deletes or pushes anything; they only print a Markdown report. Node 18 or
later, no dependencies. Run them from the repository root.

## `scripts/audit-repo.mjs`: layout, risky files and branches

```sh
node scripts/audit-repo.mjs                       # fetches origin (with --prune) first
node scripts/audit-repo.mjs --no-fetch            # skip the fetch
node scripts/audit-repo.mjs --base=origin/main > audit-repo.md
```

It reports:

1. **Uncommitted work**: modified and untracked files, stashes.
2. **Layout**: top-level entries and entries in `backend/` and `frontend/` that are not in the
   expected lists, and test files that still live inside `src/`.
3. **Files that should not be in the repo**: names matching risky patterns (`.env*` except
   `.env.example`, key and password files, dumps, patches, media). The patterns are broad on
   purpose and match file names only, so expect false positives such as `PasswordInput.tsx`;
   verify each hit.
4. **Local main**: commits on local `main` that are not on the base, or the other way round.
5. **Branches**: every local and remote branch against the base (`origin/main` by default): merged,
   merged with the same changes, merged through a squashed pull request (read with the GitHub CLI
   when `gh` is installed and logged in), or unmerged. It ends with `git branch -d` / `-D`
   commands for local branches that are safe to delete, for you to run yourself.

Exit code 1 means at least one branch has work that is not in the base.

**The expected-layout lists are meant to be edited.** `EXPECTED_TOP` (top-level entries) and
`EXPECTED_IN` (entries allowed in `backend/` and `frontend/`) near the top of the script describe the
layout this repo wants. When something is added on purpose, add it there instead of ignoring the
warning. `RISKY` holds the file-name patterns for section 3.

Note: the default fetch runs `git fetch --prune`, which removes local remote-tracking refs for
branches deleted on GitHub (never local branches). Use `--no-fetch` to leave them alone.

## `scripts/audit-structure.mjs`: source tree structure

```sh
node scripts/audit-structure.mjs frontend/src > audit-frontend.md
node scripts/audit-structure.mjs backend/src  > audit-backend.md
node scripts/audit-structure.mjs frontend/src '~'   # optional 2nd argument: path alias prefix (default @)
```

It builds an import graph with regular expressions (no TypeScript compiler) and reports:

1. Files nothing imports (or only tests import).
2. Shared-layer files used by only one feature: candidates to move into that feature.
3. Feature files used by other features: candidates to promote to a shared folder.
4. Cross-feature import counts.
5. Type files in the wrong place.
6. Test files that are not next to their subject or test nothing local.

Every result is a **candidate to verify by hand**. The graph cannot see imports from config files,
dynamic imports with computed paths or framework conventions; for example
`frontend/src/test/setup.ts` shows as unused although `frontend/vitest.config.ts` loads it.
`KEEP_SHARED` and `SHARED_LAYERS` at the top of the script decide which folders count as shared by
design.

## Not picked up by lint, tests or knip

`scripts/` sits at the repository root, outside both packages: frontend ESLint lints `frontend/src`,
Vitest runs inside `frontend/`, the backend's `lint`, `lint:scripts` (`backend/scripts/`) and
`test` cover only `backend/`, CI runs in `backend/`, and there is no knip config. The scripts are
plain `.mjs` and need no build step.

See `docs/AUDIT_STRUCTURE.md` for the structure audit of October 2026 and what was applied from it.
