# Frontend architecture

The frontend is organized around backend-owned contracts. Pages remain route containers; feature components call hooks, hooks use React Query, and services use the single Axios client in `src/services/api.ts`.

## Application layers

```text
src/app/          application providers and router
src/config/       navigation metadata
src/lib/api/      API constants, errors, pagination, query keys, request helpers
src/lib/permissions/ role-to-permission checks for navigation and UI affordances
src/components/   shared layout, UI, table, form, loading, empty, and error primitives
src/features/     API-aligned feature modules
src/layouts/      dashboard shell and sidebar composition
src/pages/        existing route containers only
```

`AppProviders` establishes BrowserRouter, React Query, notifications, authentication, and organization context. The Axios interceptor supplies the JWT and organization header; backend authorization remains authoritative.

## Implemented API inventory

No frontend endpoint is inferred. The backend exposes the following route groups under `/api/v1`: auth (`register`, `signup`, `login`, `me`), public skills, organizations and organization invitations, invitation-token inspection/registration/acceptance, employee profile/tasks/dashboard/skills, supervisor profile/dashboard/employee directory/work settings, projects/documents/recommendations, tasks/progress, supervisor and employee dashboards, platform-admin users/skills/dashboard, and health endpoints.

The frontend route guards reflect the backend roles: `platform_admin` for platform administration; `organization_admin`, `supervisor`, and `employee` for tenant-scoped routes. `X-Organization-Id` is attached only to tenant-scoped requests.

## Organization administrator dashboard

`/dashboard` uses `GET /dashboard/supervisor` for active `organization_admin` and `supervisor` memberships. The TanStack Query key includes the active organization ID, preventing cached dashboard data from crossing tenants. The page renders backend-provided project, task, employee workload, document-analysis, and recommendation aggregates. Activity and supervisor totals are omitted because no read endpoint returns them. The workload chart is lazy loaded and section failures are presented without exposing backend details.

## Project list

`/projects` is available to active `organization_admin` and `supervisor` memberships and calls `GET /projects`. The backend returns the complete tenant-scoped list ordered by creation date and accepts no list query parameters. The query key includes the organization ID. Search is therefore client-side over the loaded title and description fields, reflected in `?search=`; filters, sorting controls, server pagination, and create controls are omitted until their corresponding backend support exists.

## Project details

`/projects/:projectId` is available to the same active organization administrator and supervisor memberships. It calls `GET /projects/:projectId` through the shared project service. Its React Query key is `['projects', organizationId, projectId]`, so a project response is never reused after an organization switch. The read-only overview displays only the returned title, description, status, priority, required skills, and timestamps. Documents, AI analysis, recommendations, tasks, and activity remain explicitly non-navigating “Coming next” extension points until their own routes and page experiences are implemented.

## Authentication and invitation onboarding

## Project document upload

The active Documents tab at `/projects/:projectId?tab=documents` calls `GET /projects/:projectId/documents` and uploads through `POST /projects/:projectId/documents` with a single `file` multipart field. The document-list key is `['documents', organizationId, projectId]`. PDF, DOCX, and TXT MIME types are allowed up to 10 MB. Axios reports actual upload progress and an in-flight upload can be cancelled. The list polls every three seconds only while the backend reports at least one `pending` extraction; polling stops when all documents are `extracted` or `failed`. There is no backend document deletion endpoint, and document analysis content is intentionally not presented here.

## AI analysis viewer

`/projects/:projectId?tab=analysis` uses the same tenant-scoped `GET /projects/:projectId/documents` response and `['documents', organizationId, projectId]` query key. The backend attaches one persisted analysis to each document when available; there is no standalone analysis route, project-level aggregate, re-analysis action, or analysis status enum. The viewer defaults to the newest document with analysis, accepts only a document ID from the loaded project documents, and stores selection in `documentId`. It displays the persisted summary, complexity, estimated hours, required and preferred skills, suggested roles, and collapsed provider/model metadata. Raw provider output is not returned by this contract and is not rendered. Existing document polling continues only while extraction is `pending`; completed analysis is not polled.

## Employee recommendations viewer

`/projects/:projectId?tab=recommendations` is available to the same organization administrator and supervisor roles as project details. It uses `GET /projects/:projectId/recommendations` with `['recommendations', organizationId, projectId]` for the latest saved recommendation run, plus `POST /projects/:projectId/recommendations` to synchronously create a new saved run. Generation requires the backend’s latest project document analysis and at least one organization employee. The backend provides rank-ordered results, and the client preserves that order without sorting or recalculating scores. It displays returned score, reasons, skill alignment, workload, availability, performance, capacity, suitability, and optional score-breakdown values. Recommendations remain advisory; assignment requires explicit confirmation in the separate assignment dialog. There is no snapshot history, deletion, or regeneration endpoint distinct from generating a new latest run.

## Recommendation assignment

The recommendation card’s `Assign employee` action opens a guarded dialog and submits only to `POST /projects/:projectId/recommendations/assign`. The backend accepts exactly one of `taskId` or a nested `task` object, along with the persisted `recommendationRunId` and `employeeId`. Existing-task choices come from the implemented `GET /tasks` response, filtered to the current project’s unassigned tasks; create-task mode accepts the backend’s title, description, low/medium/high priority, estimated hours, and optional ISO date fields. Successful assignment invalidates only the current organization/project recommendations, project, task, and dashboard queries. No recommendation score is changed locally and no assignment state is invented.

Public owner registration uses `POST /auth/register`; public employee provisioning is intentionally not exposed because the backend legacy `/auth/signup` endpoint is disabled by default. Sessions are restored by validating the stored bearer token with `GET /auth/me`, never by treating local storage as authentication proof. A 401 response clears the session and React Query cache centrally.

The invitation link route is `/invitations/accept?token=…`. The token stays only in the URL during the flow: the client inspects it with `GET /invitations/:token`, creates a new invitee account using `POST /invitations/:token/register`, or accepts it for an authenticated matching user using `POST /invitations/:token/accept`. It is never persisted or used to derive access locally.

After sign-in, `GET /organizations` refreshes memberships. A single active membership is selected automatically; a valid saved organization ID is restored; users with multiple active memberships use `/select-organization`; and users with no active membership receive the safe onboarding/access state. The membership returned by the backend remains the authorization source.
## Public landing and organizer registration

The public route `/` uses a standalone marketing layout with anchored sections for the supported workflow, features, roles, and security model. It does not initialize organization-scoped data or load the authenticated dashboard shell. `/login` and invitation onboarding remain separate public entry points.

`/register` is organizer self-registration. The backend contract is intentionally two-step: `POST /api/v1/auth/register` accepts only email and password, creates an authenticated account with no role or organization membership, and returns a session; the authenticated client then calls `POST /api/v1/organizations` with `{ name, slug }`. The backend creates the organization membership and administrator role. The frontend never submits or assigns a role, employee profile, or organization ID during registration. Email verification is not required by the current backend implementation; the registration service confirms the auth user and returns a session.

After organization creation, the organization provider refreshes memberships and selects the returned organization. The user enters the existing dashboard; a dismissible administrator welcome panel provides navigational next steps without fabricating checklist completion. Registration errors preserve only non-sensitive form values and never retain or log passwords. Existing invitation registration continues to use its dedicated `/signup` and invitation routes.

Unsupported public capabilities intentionally omitted: employee or supervisor self-registration, social login, pricing, contact-sales, organization settings, and persistent onboarding completion data.
## Organization team directory

Organization administrators use the Team route (`/team`) to view active employee and supervisor memberships from `GET /organizations/:organizationId/members`. The query key is `['team', organizationId]`, so an organization switch cannot reuse a previous organization's team data.

Supervisors continue to use `/employees`, which calls `GET /supervisors/employees` and returns employee profiles only. This separation protects task assignment and recommendation flows from including supervisors as employee candidates.
