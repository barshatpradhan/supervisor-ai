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

## Authentication and invitation onboarding

Public owner registration uses `POST /auth/register`; public employee provisioning is intentionally not exposed because the backend legacy `/auth/signup` endpoint is disabled by default. Sessions are restored by validating the stored bearer token with `GET /auth/me`, never by treating local storage as authentication proof. A 401 response clears the session and React Query cache centrally.

The invitation link route is `/invitations/accept?token=…`. The token stays only in the URL during the flow: the client inspects it with `GET /invitations/:token`, creates a new invitee account using `POST /invitations/:token/register`, or accepts it for an authenticated matching user using `POST /invitations/:token/accept`. It is never persisted or used to derive access locally.

After sign-in, `GET /organizations` refreshes memberships. A single active membership is selected automatically; a valid saved organization ID is restored; users with multiple active memberships use `/select-organization`; and users with no active membership receive the safe onboarding/access state. The membership returned by the backend remains the authorization source.
