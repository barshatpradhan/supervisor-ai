# Structure and dead-code audit

Read-only audit of file organization, dead code, type placement and tests. Nothing was changed, moved or deleted; this file is the only addition.

- Branch: `feature/messaging-project-channels` (commit `04460f3`), audited 2026-10-21.
- Scope: `frontend/src`, `backend/src`, `backend/scripts`, repository root, `supabase/`.

## Status (updated as batches land)

Applied on branch `chore/structure-cleanup`, one commit per batch, each with tsc, lint, tests and build passing in both packages and knip rerun:

| Batch | Commit | Result |
|---|---|---|
| F. Test safety and list | `22a543b` | Two database tests guarded and moved to `npm run test:integration`; two pure tests added to `npm test` (23 → 33); real 401 test; email import cycle gone (madge: no cycles). |
| C. Backend dead code and stray files | `7e3f570` | Backend knip: no issues. |
| A. Dead frontend files | `2a3bb21` | 20 files and the dead functions removed; frontend knip: no unused files, exports or types. |
| B. Unused dependencies | `bdf9cd1` | Six packages removed. **`recharts` is kept on purpose** (planned charts), so knip still lists it. |
| D. Service placement | `7d49059` | Single-feature services and hooks moved into their features; services convention documented. |
| E. Single route layer | `0ae48f8` | `features/*/pages` wrappers removed; routes unchanged. |
| H, I | not applied | Replaced by "Allowed cross-feature imports" in `docs/ARCHITECTURE.md` (`2d409d3`). |
| G. Task progress single source | **not started** | Characterization tests are in place first (`taskProgress.characterization.test.ts`, run with `npm run test:integration`); waiting for approval. |

Known flaky test: `InviteMemberDialog` "Sending invitation" checks a short-lived pending state and can fail when the machine is under heavy load; it passes on rerun. Not changed by the cleanup.

## How this was produced

| Tool | Result |
|---|---|
| `scripts/audit-structure.mjs` | **Does not exist in the repo** (no `scripts/` folder at the root). An equivalent read-only import-graph script was run from outside the repo. It resolves static imports and re-exports, `import()`, `lazy(() => import())`, `vi.mock()` / `vi.importActual()` paths and `.js` to `.ts` mappings. 289 frontend and 107 backend files, 0 unresolved relative imports. |
| `npx knip` (frontend, backend) | 20 unused frontend files, 5 unused dependencies + 2 unused devDependencies, 42 unused exports, 51 unused exported types. Backend: 1 unused file, 9 unused exports, 27 unused exported types, 0 unused dependencies, 1 configuration hint. |
| `npx madge --circular` | Frontend: none. Backend: 1 (`services/email/emailService.ts` and `services/email/invitationTemplate.ts`). |
| Manual verification | Every finding below was checked by reading the code and searching for dynamic imports, `lazy()`, string-built paths, the route table (`app/router/AppRouter.tsx`, all static imports), `vitest.config.ts` `setupFiles`, `package.json` scripts and docs. The frontend has **no** `lazy()`, `import()` or `import.meta.glob`, so the static graph is complete. |

Status labels: **confirmed unused** (no importer anywhere, checked by graph and name search), **tests-only** (imported only by tests), **false positive** (used through a convention the tool cannot see).

---

## 1. Unused files, exports and dependencies

### 1.1 Frontend unused files (all 20 confirmed unused)

The import graph matches knip exactly. The only files with no importer that are *not* dead are `main.tsx` (Vite entry, `index.html`) and `test/setup.ts` (`vitest.config.ts` `setupFiles`). Those are false positives of a naive "no importer" check, and knip already excludes them.

| File | Status | Evidence |
|---|---|---|
| `hooks/useEmployees.ts` | confirmed unused | 0 importers; name appears only in `docs/ARCHITECTURE.md`. Legacy `useApiResource` hook. |
| `hooks/useTask.ts` | confirmed unused | 0 importers. Its only dependency is `hooks/useTasks.ts`. |
| `hooks/useTasks.ts` | confirmed unused | 1-line re-export of `features/tasks/hooks/useTasks`; only importer is the dead `hooks/useTask.ts`. |
| `hooks/useProject.ts`, `hooks/useProjects.ts` | confirmed unused | 1-line re-export shims of `features/projects/hooks/*`; every live caller imports the feature path. |
| `hooks/useProjectRecommendations.ts` | confirmed unused | 0 importers; single-argument legacy version superseded by `features/projects/hooks/useProjectRecommendations.ts`. |
| `services/tasks/taskService.ts` | confirmed unused | Re-export shim of `features/tasks/services/taskService`; 0 importers. |
| `services/projects/projectService.ts` | confirmed unused | Re-export shim of `features/projects/services/{projectService,projectDocumentService}`; 0 importers. |
| `lib/utils.ts` (`cn`) | confirmed unused | 0 importers; the only user of `clsx` and `tailwind-merge`. |
| `features/projects/components/ProjectPanel.tsx` | confirmed unused | 0 importers. Root of a dead chain. |
| `features/projects/components/ProjectDetailCard.tsx` | confirmed unused | Only importer: `ProjectPanel.tsx`. |
| `features/projects/hooks/useProjectManager.ts` | confirmed unused | Only importer: `ProjectPanel.tsx`. `ProjectsModule` and `ProjectDetailsModule` own their own state. |
| `features/projects/hooks/useProjectDocumentManager.ts` | confirmed unused | Only importer: `useProjectManager.ts`. |
| `features/projects/hooks/useProjectDocument.ts` | confirmed unused | Only importer: `useProjectDocumentManager.ts`. |
| `features/auth/components/SignupForm.tsx` | confirmed unused | 0 importers; `/signup` renders `pages/SignupPage.tsx` → `RegisterForm`. |
| `features/auth/hooks/useEmployeeSignupForm.ts` | confirmed unused | Only importer: `SignupForm.tsx`. |
| `features/dashboard/pages/SupervisorDashboardPage.tsx` | confirmed unused | 0 importers; the router uses `pages/DashboardPage.tsx` → `DashboardRoute`. |
| `components/ui/DataTable.tsx` | confirmed unused | 0 importers; mentioned only in `docs/ARCHITECTURE.md`. |
| `components/shared/SkeletonPage.tsx` | confirmed unused | 0 importers. |
| `components/shared/SkeletonTable.tsx` | confirmed unused | Only importer: `SkeletonPage.tsx`. (`SkeletonCard.tsx` stays: used by `EmployeeDashboardSkeleton`.) |

Knock-on effect: once these go, `features/projects/services/projectDocumentService.ts#getProjectDocument` has no caller (its only user was the dead shim).

### 1.2 Backend unused files

| File | Status | Evidence |
|---|---|---|
| `src/scripts/organizationVerification.ts` | confirmed unused | No importer, no `package.json` script (the other `verify:*` scripts exist, this one does not), no doc reference. It only exports a static array of scenario descriptions; it runs nothing. |
| `src/services/taskProgressMetrics.ts` | **tests-only, and the test tests a copy** | Only importer is `taskProgressMetrics.test.ts`. `taskService.ts` re-implements the same rules inline (`createTaskProgress` lines ~704-706 for status, `recalculateProjectProgress` lines ~193-197 for project %). The test passes even if the real code changes. |

### 1.3 Stray and scratch files (tracked in git)

| File | Finding | Evidence |
|---|---|---|
| `backend/test-gemini.ts` | Scratch diagnostic | Ad hoc Gemini call; prints the first 8 characters of `GEMINI_API_KEY` to the console. Not referenced by any script or doc. Added in `6b4198a`. |
| `backend/test-project-description.txt` | Leftover sample input | 7-line sample spec, no references. |
| `supabase/seed.sql` | Placeholder | 2 comment lines. Apparent references are only the `*_seed.sql` test file names. |
| `supabase/seed_employee_skills_for_recommendation_test.sql` | Manual test seed | 51 lines, only mentioned in `docs/ARCHITECTURE.md`. Keep if still used by hand; otherwise move under `supabase/tests/`. |
| `frontend/07-logo-final-locked.md`, `frontend/08-color-system.md` | Design notes at the package root | Linked from `frontend/README.md`. Not dead, but belong under `frontend/docs/`. |

No `investigate-*.ts`, `*.diff`, `*.dump`, `*.bak` or backup files are tracked.

### 1.4 Secrets

- **No secrets tracked.** `git grep` for Supabase JWTs, Brevo (`xkeysib-`), Google (`AIza`) and generic `sk-` keys found nothing.
- `backend/.env` and `SMPT-Key-Brevo.txt` exist locally but are git-ignored, and `git log --all` shows neither was ever committed.
- `backend/.env.example` holds placeholders only.
- **Risk:** `backend/test-gemini.ts` logs a key prefix (see 1.3).
- **Risk:** two unlisted backend tests write to whatever `SUPABASE_URL` is configured, which locally means production (see 4.2).

### 1.5 Unused npm dependencies (frontend, all confirmed)

| Package | Evidence |
|---|---|
| `recharts` | No import anywhere; charts are hand-written SVG in `components/charts/`. (`docs/ARCHITECTURE.md` still mentions a lazily loaded Recharts chart; that is stale.) |
| `clsx`, `tailwind-merge` | Only imported by the dead `lib/utils.ts`. |
| `class-variance-authority`, `@radix-ui/react-slot` | No import anywhere. |
| `autoprefixer`, `postcss` (dev) | No `postcss.config.*`; Tailwind v4 runs through `@tailwindcss/vite`. |

Backend: knip reports no unused dependencies. It does flag `"main": "server.js"` in `backend/package.json`, which doesn't exist (the entry is `dist/server.js` via `npm start`). This is harmless but misleading.

### 1.6 Unused exports

**Dead functions and components** (the only reference is their own definition):

| Package | Symbol | File |
|---|---|---|
| backend | `listApprovedSkills`, `syncEmployeeSkills` | `services/skillService.ts` |
| backend | `assertPlatformRole` | `services/userService.ts` |
| frontend | `createEmployeeProfile` | `services/employees/employeeService.ts` |
| frontend | `updateEmployeeWorkSettings` | `services/supervisors/supervisorService.ts` |
| frontend | `getProjectDocument` | `features/projects/services/projectDocumentService.ts` (dead once the shim goes) |
| frontend | `ProjectsEmptyState`, `TasksEmptyState`, `EmployeesEmptyState` | `components/shared/EmptyState.tsx` |
| frontend | `AiBadge` | `components/ui/Chip.tsx` |
| frontend | `normalizePagination`, `buildPaginationSearchParams` (+ types) | `lib/api/pagination.ts` (the whole file is only re-exported by `lib/api/index.ts`) |

**Used internally but needlessly exported** (drop `export` only):
- Backend: `canSeeConversation`, `EMOJI_GROUPS`, `ALLOWED_EMOJI`, `MESSAGE_MAX_LENGTH`, `DIRECTORY_PAGE_SIZE`, `scripts/demo-seed/shared.ts#isSeedEmail`.
- Frontend: the presentation helpers knip lists under `features/*/utils/*Presentation.ts`, the account-creation helpers, the messaging polling constants, `QUICK_REACTIONS`, `MAX_SUGGESTED_MENTIONS`, `SITE_TAGLINE`.

Low value; only worth doing alongside other edits to the same files.

**Unused exported types:** 51 frontend and 27 backend. See section 3.

---

## 2. Feature placement (frontend)

Rule: code used by exactly one feature lives in that feature; code used by two or more features lives in a shared folder.

### 2.1 Shared folders holding single-feature code

| Current path | Only user | Proposed path | Importers to update |
|---|---|---|---|
| `services/admin/adminDashboardService.ts` | platform-admin | `features/platform-admin/services/adminDashboardService.ts` | `features/platform-admin/components/PlatformAdminDashboard.tsx`, `.../PlatformAdminDashboard.test.tsx` (`vi.mock` path) |
| `services/admin/adminSkillService.ts` | platform-admin | `features/platform-admin/services/adminSkillService.ts` | `features/platform-admin/components/PendingSkillsQueue.tsx`, `.../PlatformAdminDashboard.test.tsx` |
| `services/admin/adminUserDirectoryService.ts` | platform-admin | `features/platform-admin/services/adminUserDirectoryService.ts` | `features/platform-admin/components/UserDirectory.tsx`, `.../PlatformAdminDashboard.test.tsx` |
| `services/admin/adminUserService.ts` | admin-users | `features/admin-users/services/adminUserService.ts` | `features/admin-users/hooks/useAdminUserCreationForm.ts` |
| `services/auth/authService.ts` | auth | merge into the existing `features/auth/services/authService.ts` (today a re-export barrel of this file) | `features/auth/components/ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `features/auth/services/authService.ts`; `features/invitations/services/invitationService.test.ts` mocks the feature path, which is unchanged |
| `hooks/useSupervisorProfile.ts` | supervisors | `features/supervisors/hooks/useSupervisorProfile.ts` | `features/supervisors/hooks/useSupervisorProfileEditor.ts` |
| `components/ui/Tabs.tsx` | projects | (see note) | `features/projects/components/ProjectDetailsModule.tsx` |
| `components/ui/FormField.tsx` | projects | (see note) | `ProjectsModule.tsx`, `RecommendationAssignmentDialog.tsx` |
| `components/charts/ColumnChart.tsx` | team | (see note) | `features/team/components/TeamWorkloadModule.tsx` |

**Note:** `Tabs`, `FormField` and `ColumnChart` are generic design-system primitives that happen to have one user today. Moving them into a feature would make the next reuse import across features. Recommendation: **document them as an exception** ("`components/ui` and `components/charts` are the design system regardless of use count") rather than move them.

Correctly shared (2+ features): `services/{employees,skills,supervisors,recommendations}`, `hooks/{useApiResource,useEmployeeProfile,useSkillCheck,useNotifications}`, `lib/api/*`, `components/ui/*` (except the note above), `types/backend.ts`. `hooks/useCurrentUserName.ts` is used only by `layouts/AppLayout.tsx`, which is app shell, not a feature; fine where it is.

### 2.2 Inconsistent re-export direction between `services/` and `features/*/services/`

| Pattern | Files | Direction |
|---|---|---|
| Top-level shim → feature (dead) | `services/tasks/taskService.ts`, `services/projects/projectService.ts` | top-level re-exports feature |
| Feature barrel → top-level (live) | `features/auth/services/authService.ts` | feature re-exports top-level, and two auth components bypass the barrel |
| Top-level is real, features import it | `services/{employees,skills,supervisors,recommendations,admin}` | feature imports top-level |
| Two services, same name, different contents | `services/recommendations/recommendationService.ts` (generate, latest, assign) and `features/ai-recommendations/services/recommendationService.ts` (facade over projects, supervisors and the top-level one) | both live |

Proposed convention:
- Shared API wrappers live in `services/<domain>/`.
- A feature's own API calls live in `features/<f>/services/`.
- No re-export shims in either direction.

This is achieved by deleting the two dead shims (batch A), moving `services/admin/*` and `services/auth` (batch D), and renaming the ai-recommendations facade to `recommendationWorkspaceService.ts` so the two names stop colliding (batch D).

Separately, `services/api.ts` (the core axios client) imports `features/auth/utils/tokenStorage` and `features/organizations/utils/organizationRequestContext`, so the shared HTTP layer depends on two features. It works and madge finds no cycle, but the dependency points the wrong way. Proposed (batch F, optional): move those two small utilities to `lib/api/` (or `lib/session/`) and have the features import them from there.

### 2.3 `pages/` wrappers

- `pages/*.tsx` are route entry points imported only by `AppRouter.tsx`. Most are 5-line wrappers.
- Four routes have **two** wrapper layers:

| Route | Chain |
|---|---|
| `/projects` | `pages/ProjectsPage` → `features/projects/pages/ProjectsManagementPage` → `ProjectsRoute` |
| `/projects/:id` | `pages/ProjectDetailsPage` → `features/projects/pages/ProjectDetailsPage` → … |
| `/tasks` | `pages/TasksPage` → `features/tasks/pages/TasksManagementPage` → `TasksRoute` |
| `/ai-recommendations`, `/admin/users/new` | `pages/AiRecommendationsPage` / `pages/AdminUserCreatePage` → `features/*/pages/*` → … |

Proposed (batch E): keep `pages/` as the single route layer, as the other 18 routes do. Delete the five `features/*/pages/*.tsx` files (including the dead `SupervisorDashboardPage`) and point each `pages/*.tsx` at the feature's `*Route`/`*Module` component.

Importers to update: `pages/ProjectsPage.tsx`, `pages/ProjectDetailsPage.tsx`, `pages/TasksPage.tsx`, `pages/AiRecommendationsPage.tsx`, `pages/AdminUserCreatePage.tsx`. `AppRouter.tsx` is unchanged.

`pages/LandingPage.tsx` (525 lines), `RegisterOrganizerPage.tsx` and `OrganizationInvitationsPage.tsx` contain real UI, which fits `pages/` as the home of route-level marketing and onboarding screens.

### 2.4 Cross-feature imports (feature code used by other features)

| Code | Owner | Also used by | Proposal |
|---|---|---|---|
| `useAuth`, `AuthProvider`, `ProtectedRoute`, `RoleGuard` | auth | 12+ files, app, layouts | Keep: app-wide context owned by its feature. Document as an exception. |
| `useOrganization`, `OrganizationProvider`, `OrganizationRoute`, `OrganizationSwitcher` | organizations | 25 files | Same: document as an exception. |
| `features/tasks/utils/taskPresentation.ts`, `components/TaskStatusBadge.tsx`, `utils/taskBoard.ts` (`getTaskProgress`) | tasks | dashboard | Move to shared, e.g. `components/domain/TaskStatusBadge.tsx` and `lib/presentation/task.ts` (batch G, optional). |
| `features/tasks/hooks/useTasks.ts`, `useAssignableEmployees.ts` | tasks | team (`TeamWorkloadModule`) | Move to `hooks/` or a shared `features/workforce` (batch G, optional). |
| `features/tasks/services/taskService.ts` | tasks | messaging, projects | Move to `services/tasks/taskService.ts` once the shim is gone (batch G, optional). |
| `features/projects/hooks/{useProjects,useProjectDocuments,useProjectRecommendations,useProjectAssignmentTasks}`, `components/RecommendationAssignmentDialog.tsx`, `services/{projectService,projectDocumentService}.ts` | projects | tasks, ai-recommendations | Move the services to `services/projects/`; the hooks and dialog are the ai-recommendations ↔ projects ↔ tasks triangle (batch G, optional). |
| `features/organizations/services/organizationService.ts`, `utils/organizationPresentation.ts`, `utils/roleRedirect.ts` | organizations | team, invitations, supervisors | Move the service to `services/organizations/` (batch G, optional). |
| `features/invitations/utils/invitationNavigation.ts` | invitations | auth, pages | Shared by auth and invitations: `lib/navigation/` or keep and document (batch G). |
| `features/messaging/components/AskAboutTaskLink.tsx` | messaging | tasks | Intentional integration point; document. |
| `features/messaging/hooks/useMessagingQueries.ts` | messaging | `layouts/AppLayout.tsx` (badge) | App shell; fine. |
| `features/ai-recommendations/components/RecommendationCard.tsx` | ai-recommendations | `pages/LandingPage.tsx` | Marketing preview; fine. |
| `features/account-creation/*` | account-creation | admin-users only (its other user, auth `SignupForm`, is dead) | Once batch A lands, account-creation has one consumer: fold it into `features/admin-users/` or document it as a reusable wizard (batch H, optional). |

---

## 3. Types

### 3.1 Types defined in component, service, hook or util files and imported elsewhere

| Type | Defined in | Used by | Proposal |
|---|---|---|---|
| `SkillCheckOutcome` | `hooks/useSkillCheck.ts` | admin-users, employees | Move to `types/skills.ts` (2 features). |
| `UserDirectoryFilters` | `services/admin/adminUserDirectoryService.ts` | platform-admin | Move to `features/platform-admin/types/` with batch D. |
| `TaskBoardCard` | `features/tasks/components/TaskBoard.tsx` | `TasksModule.tsx` (same feature) | Optional: `features/tasks/types/task.ts`. |
| `EmployeeProfileFormValues` | `features/employees/utils/profileForm.ts` | same feature | Fine (form-local). |
| `ThreadData` | `features/messaging/utils/threadCache.ts` | same feature | Fine. |
| `AssignRecommendationRequest` | `services/recommendations/recommendationService.ts` | that service | Fine. |
| `NavigationItem`, chart `Datum`/`ColorToken`, notification types | their shared modules | their own folder | Fine. |

### 3.2 Duplicated type definitions

- **No type name is defined twice** within the frontend or within the backend.
- **Structural duplication between packages:** `frontend/src/types/backend.ts` hand-mirrors `backend/src/types/*`. This is the API contract, and there's no shared package. Not a fix for this audit; noted as the source of drift risk.
- **Alias layer:** many `features/*/types/*.ts` files only alias `Backend*` types (e.g. `features/dashboard/types/dashboard.ts`). knip lists about 25 unused exported types in `features/*/types/`, most of them such aliases (`SupervisorDashboard*`, `EmployeeDashboard*`, `CreateProjectRequest`, `UpdateProjectRequest`, `ProjectPanelMode`, `TaskProgress`, `CreateTaskProgressRequest`, `RecommendationProject/Result/EmployeeMetrics`, …). Proposed: delete the unused aliases (batch C).

### 3.3 `frontend/src/types/backend.ts` by usage

| Category | Count | Detail |
|---|---|---|
| Truly unused | 1 | `BackendDocumentAnalysisRequest` |
| Needlessly exported | 9 | Used only to compose other types in the same file: `BackendDocumentAnalysisComplexity`, `BackendLinkedUser`, `BackendEmployeeSkill`, `BackendAssignableEmployeeSkill`, `BackendRecommendationScoreBreakdown`, `BackendCurrentUserOrganization{Membership,Invitation,}Summary`, `BackendInvitationDeliveryStatus`. Drop `export`. |
| Single feature | 47 | dashboard (19), invitations (7), organizations (6), projects (6), tasks (4), auth (3), account-creation, platform-admin |
| Shared | 38 | |

**Recommendation for the 47 single-feature types: leave them in `types/backend.ts`.** That file is the wire contract mirror: one place to diff against `backend/src/types` when the API changes. Splitting it across 10 features loses that, for little gain. If you still want the rule applied strictly, the dashboard block (19 types) is the only one big enough to justify `features/dashboard/types/backend.ts` (batch I, optional).

### 3.4 Backend types

- `src/types/dashboard.ts` and `src/types/organization.ts` export 16 sub-interfaces used only to build the response types in the same file. Drop `export`.
- `EmployeeRecommendation`, `SignupInput`, `SupportedDocumentMimeType`, `AssignableEmployeeSkill`, `PublicEmployeeSignupResult`, `AssignTaskInput` and `OrganizationContext` are exported and never imported. Check each before deleting; `SignupInput` belongs to the legacy employee-signup path that is behind `AUTH_LEGACY_EMPLOYEE_SIGNUP_ENABLED`.
- The service files (`skillService`, `teamService`, `userDirectoryService`) export response interfaces that nothing else imports. Fine.

---

## 4. Test files

### 4.1 Inventory (40 files; all frontend tests pass: 100/100)

Every test file sits next to its subject except the three noted. None are skipped (`.skip`, `.only`, `.todo`, `xit`, `xdescribe`: 0 matches). "Matches code" means the test passes against the current code, or for unlisted backend tests that its imports still resolve.

**Backend**

| Test | Covers | Next to subject | In `npm test` | Notes |
|---|---|---|---|---|
| `scripts/developmentDatabaseReset.test.ts` | Reset safety guards and delete order | yes | yes | Good. |
| `services/email/emailService.test.ts` | Brevo/console providers, invitation URL, error logging | yes | yes | Good (26 assertions). |
| `services/messagingRules.test.ts` | Body normalization, mentions, cursor, emoji, poll detection, per-user limiter | no (covers `utils/messageText`, `utils/emoji`, `middleware/rateLimiter`) | yes | Fine as a rules suite. |
| `services/taskAssignmentRules.test.ts` | `nextAssignedAt` | yes | yes | Good. |
| `services/taskProgressMetrics.test.ts` | `statusForProgress`, `projectProgressFromHours` | yes | yes | **Tests a copy**: the production logic in `taskService.ts` doesn't call these functions (see 1.2). |
| `services/messagingService.test.ts` | 34 integration tests: access, history, mentions, tags, reactions, unread, DMs, reassignment | yes | separate `test:messaging` | Needs a local Supabase stack; refuses non-local URLs. Not in CI. |
| `services/ai/skillVerification.test.ts` | `parseSkillVerdicts` | no (subject `skillVerification.service.ts`) | **no** | Pure; passes (6/6) with no `.env`. Safe to add. |
| `utils/skillNames.test.ts` | Skill-name normalization | yes | **no** | Pure; passes (4/4) with no `.env`. Safe to add. |
| `services/invitationDelivery.test.ts` | Invitation flow with Brevo mocked through `fetch` | no | **no** | **Writes Auth users and rows through the configured Supabase with no localhost guard; locally that is production.** Not run in this audit. |
| `services/taskService.test.ts` | `listTasks` returns per-task progress history | yes | **no** | **Same: creates Auth users, an org, a project and tasks on the configured Supabase with no guard.** Not run. |

**Frontend**

| Test | Covers | Notes |
|---|---|---|
| `app/router/AppRouter.test.tsx` | Route guards and redirects | |
| `components/ui/PasswordInput.test.tsx` | Show/hide toggle | |
| `features/auth/components/LoginForm.test.tsx`, `RegisterForm.test.tsx` | Form submit and invitation return | Thin (1-2 tests). |
| `features/invitations/**` (5 files) | Accept page, invite dialog, pending list, service, navigation | Strongest frontend coverage. |
| `features/messaging/**` (7 files) | Composer, item label, thread scoping, chip, ask link, thread hook, suggestions | |
| `features/organizations/components/OrganizationRoute.test.tsx` | Org gating | |
| `features/platform-admin/components/PlatformAdminDashboard.test.tsx` | Dashboard, queue, directory | Mocks `services/admin/*` paths (update in batch D). |
| `features/projects/**` (5 files) | Details module, list, recommendations section, assignment dialog, document presentation | |
| `hooks/useSkillCheck.test.ts` | Skill check outcomes | |
| `layouts/AppLayout.test.tsx` | Nav, title, unread badge | |
| `pages/LandingPage.test.tsx`, `NotFoundPage.test.tsx`, `OrganizationInvitationsPage.test.tsx`, `RegisterOrganizerPage.test.tsx` | Page content and redirects | |
| `services/api.test.ts` | **Trivial** | Title says "keeps navigation under route-guard control after a 401", but the only assertion is `expect(api).toBeDefined()`. The 401 interceptor is untested. |

### 4.2 Gaps

- **Unused test helpers:** none. The only helper is `test/setup.ts`, which is used.
- **Backend files missing from the hard-coded `npm test` list:** `skillVerification.test.ts`, `skillNames.test.ts` (pure, add them), `invitationDelivery.test.ts`, `taskService.test.ts` (database-touching; give them the same localhost guard as `messagingService.test.ts` and a separate `test:integration` script, never the default list).
- **Important services without tests (or only indirect ones):**

| Area | Coverage today |
|---|---|
| Messaging (backend) | 34 integration tests, but only on a local stack. The HTTP layer (routes, controllers, rate limiters on real routes) has no test. |
| Task assignment | `assignTask` is covered only indirectly (messaging tests plus the pure `nextAssignedAt`). Capacity recalculation, `createTaskProgress` status transitions and project progress are untested against the real code (see the `taskProgressMetrics` copy). |
| Recommendations (backend) | `recommendationService.ts` (`generateProjectRecommendations`, assignment) has **no tests**. |
| Invitations (backend) | `organizationService` invitation create, accept, revoke and expiry: only the unlisted, unguarded `invitationDelivery.test.ts`. |
| Frontend, no tests at all | tasks (`TasksModule`, `TaskDetailModule`, `TaskAssignmentSection`, `useTaskManager`), dashboard, team, employees, supervisors, ai-recommendations, admin-users |

---

## 5. Prioritized findings

| # | Finding | Evidence | Proposed action | Risk | Code change |
|---|---|---|---|---|---|
| 1 | Two unlisted backend tests write to the configured Supabase (production locally) | 4.1, 4.2 | Add the localhost guard from `messagingService.test.ts`; move them to a `test:integration` script | low | yes (tests only) |
| 2 | `taskProgressMetrics` tests a copy of the real logic | 1.2 | Make `taskService.ts` call `statusForProgress` / `projectProgressFromHours` (identical behaviour) | medium (task write path) | yes |
| 3 | `backend/test-gemini.ts` scratch script logs a key prefix | 1.3 | Delete | low | yes (delete) |
| 4 | 20 dead frontend files (legacy hooks, shims, `cn`, ProjectPanel chain, SignupForm chain, skeletons, DataTable) | 1.1 | Delete; update `docs/ARCHITECTURE.md` | low | yes (delete) |
| 5 | 7 unused frontend dependencies | 1.5 | `npm uninstall` | low | yes (`package.json`, lockfile) |
| 6 | Dead functions (backend 3, frontend 8) | 1.6 | Delete | low | yes |
| 7 | 2 pure backend tests missing from `npm test` | 4.2 | Add to the list | low | yes (`package.json`) |
| 8 | `services/api.test.ts` asserts nothing it claims | 4.1 | Write a real 401 interceptor test, or delete | low | yes (tests) |
| 9 | Single-feature code in `services/admin`, `services/auth`, `hooks/useSupervisorProfile` | 2.1 | Move into features | low | yes (moves) |
| 10 | Double page wrappers for 4 routes | 2.3 | Delete `features/*/pages/*`, point `pages/*` at the routes | low | yes |
| 11 | Two different `recommendationService.ts` files | 2.2 | Rename the ai-recommendations facade | low | yes |
| 12 | Unused feature type aliases (about 25) and needlessly exported types | 3.2, 3.3, 3.4 | Delete aliases, drop `export` | low | yes |
| 13 | Shared HTTP client imports two features | 2.2 | Move `tokenStorage` and `organizationRequestContext` into `lib/` | medium | yes |
| 14 | Cross-feature imports (tasks→dashboard/team/messaging, projects→tasks/ai-recs, organizations→team/invitations) | 2.4 | Move the shared pieces to shared folders, or document as allowed | medium (many importers) | yes |
| 15 | account-creation has one consumer after #4 | 2.4 | Fold into admin-users, or document | low | yes |
| 16 | Stray non-source files | 1.3 | Delete `test-project-description.txt` and `seed.sql`; move the design `.md` files to `frontend/docs/` | low | yes |
| 17 | `backend/package.json` `"main": "server.js"` missing | 1.5 | Point at `dist/server.js` or remove | low | yes |
| 18 | Type-only cycle `emailService` ↔ `invitationTemplate` | madge | Move `OrganizationInvitationEmailInput` to `services/email/types.ts` | low | yes |
| 19 | No tests for backend recommendations and invitation lifecycle; frontend tasks, dashboard and team untested | 4.2 | Write tests (separate work) | — | yes |
| 20 | `docs/ARCHITECTURE.md` is stale (mentions `TaskPanel.tsx`, `MetricCard.tsx`, a Recharts chart, and files in #4) | grep | Update with each batch | low | docs |

## 6. Proposed batches

Each batch is one commit and should leave `npm run build`, `npx tsc -b` / `npx tsc --noEmit`, `npm run lint` and `npm test` passing in both packages. No public API routes or database objects change in any batch.

| Batch | Contents | Findings | Risk |
|---|---|---|---|
| **A. Delete dead frontend files** | The 20 files in 1.1, plus the dead functions and components in 1.6 (frontend) and `docs/ARCHITECTURE.md` references | #4, #6 (frontend), #20 (partial) | low |
| **B. Remove unused frontend dependencies** | `npm uninstall recharts clsx tailwind-merge class-variance-authority @radix-ui/react-slot autoprefixer postcss`. Must follow A, because `lib/utils.ts` imports two of them. | #5 | low |
| **C. Backend dead code and stray files** | Delete `test-gemini.ts`, `test-project-description.txt`, `src/scripts/organizationVerification.ts`, the 3 dead functions; fix `"main"`; drop needless exports; remove unused frontend type aliases and `BackendDocumentAnalysisRequest` | #3, #6 (backend), #12, #16 (partial), #17 | low |
| **D. Service placement** | Move `services/admin/*` and `services/auth/authService.ts` into their features; move `hooks/useSupervisorProfile.ts`; move `SkillCheckOutcome` to `types/`; rename `features/ai-recommendations/services/recommendationService.ts` to `recommendationWorkspaceService.ts` | #9, #11, 3.1 | low |
| **E. Single route layer** | Remove the 5 `features/*/pages/*.tsx` wrappers and repoint the 5 `pages/*.tsx` files | #10 | low |
| **F. Test safety and list** | Localhost guard plus `test:integration` for the two DB tests; add the two pure tests to `npm test`; replace or remove the trivial `api.test.ts`; fix the type-only email cycle | #1, #7, #8, #18 | low |
| **G. Task progress single source** | `taskService.ts` uses `taskProgressMetrics.ts` (behaviour-identical) so the existing tests cover the real path | #2 | medium |
| **H. Shared HTTP layer direction** (optional) | Move `tokenStorage` and `organizationRequestContext` into `lib/` | #13 | medium |
| **I. Cross-feature extraction** (optional, can be split per domain) | Move task presentation, `TaskStatusBadge`, the shared task, project and organization services and hooks to shared folders, or instead add a short "allowed cross-feature imports" section to `docs/ARCHITECTURE.md` | #14, #15 | medium |

Recommended order: A → B → C → F → D → E → G, then decide on H and I.
