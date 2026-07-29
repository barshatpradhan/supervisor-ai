
# Supervisor AI

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=fff)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=fff)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=111)](https://supabase.com/)

Supervisor AI is a multi-tenant workforce management platform for organization admins, supervisors, and employees. The current implementation provides a TypeScript Express API backed by Supabase and a React frontend with authenticated organization context, organization switching, protected routing, and backend-integrated authentication.

The backend already includes core APIs for authentication, organizations, invitations, employee and supervisor profiles, projects, tasks, dashboards, document uploads, document analysis, and employee recommendations. The frontend includes the application shell, authentication, organization-aware request context, and connected business modules.

## Project Objectives

- Help organization admins and supervisors create projects, manage employees, assign tasks, and track work.
- Analyze uploaded project documents to identify skills, effort, risk, and staffing signals.
- Rank employees for projects using skills, availability, workload, and performance.
- Preserve human review: AI recommendations are advisory and do not auto-assign employees.
- Keep frontend, backend, database, storage, and AI responsibilities clearly separated.

## High-Level Architecture

```mermaid
flowchart TD
  User[Browser User] --> Frontend[React Frontend]
  Frontend --> API[Express API]
  API --> Auth[Supabase Auth]
  API --> Database[Supabase PostgreSQL]
  API --> Storage[Supabase Storage]
  API --> Gemini[Google Gemini API]
  Storage --> Documents[Project Documents]
  Database --> AppData[Users, Organizations, Memberships, Profiles, Projects, Tasks, Analyses, Recommendations]
  Gemini --> Analysis[Document Analysis Result]
  API --> RecommendationEngine[Recommendation Service]
  RecommendationEngine --> Database
```

## Technology Stack

| Layer | Current Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 8 |
| Frontend language | TypeScript 6, strict mode |
| Frontend styling | Tailwind CSS 4 with CSS design tokens |
| HTTP client | Axios |
| Backend | Node.js, Express 5 |
| Backend language | TypeScript 6, strict mode, ES modules |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth JWTs |
| Storage | Supabase Storage bucket for project documents |
| Upload handling | Multer in memory storage |
| AI analysis | Google Gemini API with local fallback analysis |

## Repository Structure

```txt
supervisor-ai/
  backend/       Express API, Supabase integration, services, routes, middleware.
  frontend/      React application, auth UI, app shell, design system.
  supabase/      SQL migrations and seed files.
  CODEX.md       Project-level engineering and architecture guide.
```

## Backend Overview

The backend is an Express 5 REST API using a route, controller, service, middleware, and utility structure.

Implemented backend capabilities:

- Public auth plus authenticated organization discovery.
- Organization creation, membership resolution, invitations, and invitation acceptance.
- Platform admin user-role management and skill moderation.
- Organization-scoped employee and supervisor profile APIs.
- Organization-scoped project, task, dashboard, document, and recommendation APIs.
- Workload and performance recalculation after assignment and progress changes.
- TXT extraction plus Gemini-backed or fallback document analysis.
- Repeatable tenant-isolation verification dataset and API verification script.

See [backend/README.md](backend/README.md) for the API reference and backend architecture.

## Frontend Overview

The frontend is a Vite React application with feature-based organization.

Implemented frontend capabilities:

- Locked brand color tokens and Supervisor logo component.
- Login and signup screens connected to the backend auth API.
- Auth provider with session restore, logout, and 401 handling.
- Organization provider with active membership resolution and organization switching.
- Shared Axios client that attaches `X-Organization-Id` to tenant-scoped requests.
- Responsive app shell with role-aware navigation.
- Connected dashboards, projects, tasks, employees, profile, documents, and recommendation screens.

See [frontend/README.md](frontend/README.md) for frontend architecture and setup.

## Authentication Overview

Authentication uses Supabase Auth on the backend. The frontend stores the access and refresh tokens for development, restores the user with `/api/v1/auth/me`, loads the authenticated user’s memberships from `GET /api/v1/organizations`, and only sends `X-Organization-Id` after a verified active organization is selected.

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant API
  participant SupabaseAuth as Supabase Auth
  participant Database as users table

  User->>Frontend: Submit signup or login form
  Frontend->>API: POST /api/v1/auth/signup or /login
  API->>SupabaseAuth: Create user or sign in
  API->>Database: Read or create app user profile
  API-->>Frontend: User, access token, refresh token
  Frontend->>Frontend: Store development tokens
  Frontend->>API: GET /api/v1/auth/me with Bearer token
  API->>SupabaseAuth: Verify token
  API->>Database: Load app user role
  API-->>Frontend: Current user
```

## AI Recommendation Workflow

The current recommendation workflow is backend implemented and frontend planned.

```mermaid
flowchart TD
  Project[Project] --> Upload[Upload project document]
  Upload --> Storage[Store in Supabase Storage]
  Upload --> Extract[Extract document text]
  Extract --> Analyze[Analyze with Gemini or fallback]
  Analyze --> SaveAnalysis[Save project_document_analyses row]
  SaveAnalysis --> Generate[Generate recommendations]
  Generate --> Score[Score employees by skills, availability, performance, workload]
  Score --> Persist[Persist ai_recommendations run]
  Persist --> Review[Supervisor review UI planned]
```

## Project Lifecycle

```mermaid
flowchart LR
  Draft[Draft Project] --> Document[Document Upload]
  Document --> Analysis[Document Analysis]
  Analysis --> Recommendations[Employee Recommendations]
  Recommendations --> Tasks[Task Creation and Assignment]
  Tasks --> Progress[Employee Progress Updates]
  Progress --> Metrics[Workload and Performance Updates]
  Metrics --> Review[Supervisor Review Planned]
```

## Multi-Tenant Model

Organization-scoped authorization is driven by:

- `organizations`
- `organization_members`
- `organization_invitations`

Membership roles:

- `organization_admin`
- `supervisor`
- `employee`

Membership statuses:

- `active`
- `invited`
- `suspended`

`X-Organization-Id` selects the tenant context for business routes. The backend verifies that the authenticated user has a matching active membership before a tenant-scoped operation is allowed.

Platform administration remains separate from organization administration. The legacy `users.role` field still exists for platform compatibility and must not be treated as tenant authorization.

## Database Overview

Migrations under `supabase/migrations` define core application tables and document/recommendation tables.

| Area | Tables or Storage |
| --- | --- |
| Identity | `users` mapped to Supabase Auth users |
| Tenancy | `organizations`, `organization_members`, `organization_invitations` |
| Profiles | `employees`, `supervisors` |
| Work management | `projects`, `tasks`, `task_progress` |
| Documents | `project_documents`, `project_document_analyses` |
| Recommendations | `ai_recommendations` |
| Storage | private `project-documents` bucket |
| Skills | Services use `skills` and `employee_skills`; the current migrations include an `employee_skills` uniqueness migration but do not fully define both tables in the visible migration set. |

## Local Development Setup

Prerequisites:

- Node.js 20 or newer.
- npm.
- A Supabase project with the required schema and storage bucket.
- A Gemini API key if Gemini analysis should run instead of local fallback analysis.

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Running the Backend

```bash
cd backend
npm run dev
```

The backend defaults to port `5000` when `PORT` is not set. The current frontend Vite proxy targets `http://localhost:4000`, so align `PORT` or update the frontend proxy/environment configuration for local development.

## Running the Frontend

```bash
cd frontend
npm run dev
```

The frontend uses `VITE_API_BASE_URL` when provided and falls back to `/api/v1`.

## Environment Variables

Only variable names are documented here. Do not commit real values.

| Scope | Variables |
| --- | --- |
| Backend | `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Frontend | `VITE_API_BASE_URL` |

## Tenant Isolation Verification

The repository includes a repeatable backend verification script that seeds a dedicated two-organization dataset and checks tenant-scoped APIs for cross-organization isolation failures.

Recommended verification flow:

```bash
cd backend
npm run build
npm run verify:tenant-isolation

cd ../frontend
npm run build
npm run lint
```

Use a safe non-production Supabase environment only.

Known limitations:

- the backend verification script does not replace manual browser testing of organization switching UX
- PDF and DOCX extraction remain limited
- production hardening still needs follow-up work such as a distributed rate limiter for horizontal scaling and broader observability

## Task execution APIs

The backend now supports employee task execution without adding notifications or UI work. Employees use `GET /api/v1/employees/me/tasks`, `GET /api/v1/employees/me/dashboard`, and `PATCH /api/v1/tasks/:taskId/progress`; supervisors use `GET /api/v1/supervisors/dashboard`. All organization-scoped calls require `X-Organization-Id`.

Progress is append-only. A task becomes `todo` (pending) at 0%, `in_progress` at 1–99%, and `completed` at 100%. Project progress is stored as completed estimated hours divided by total estimated hours, multiplied by 100. Completed tasks are excluded from workload calculations, increasing employee availability automatically.

## Production operations

```mermaid
flowchart LR
  Client -->|JWT + tenant header| API[Express API]
  API --> Auth[Supabase Auth]
  API --> DB[(Supabase Postgres)]
  API --> Storage[Supabase Storage]
  API --> Gemini[Gemini Analysis]
  API --> Logs[Structured logs / metrics]
```

Production configuration, deployment requirements, and troubleshooting are documented in [docs/environment.md](docs/environment.md) and [docs/production-readiness.md](docs/production-readiness.md). Operational endpoints are `/health`, `/ready`, `/metrics`, `/api/docs`, and `/api/openapi.json`.

## Current Implementation Status

| Area | Status |
| --- | --- |
| Backend authentication | Implemented |
| Backend role authorization | Implemented |
| Backend employee and supervisor profiles | Implemented |
| Backend project and task APIs | Implemented |
| Backend document upload | Implemented |
| TXT document extraction | Implemented |
| PDF and DOCX extraction | Planned |
| Gemini document analysis | Implemented with fallback |
| Recommendation scoring and persistence | Implemented |
| Frontend auth screens and app shell | Implemented |
| Frontend organization context and switching | Implemented |
| Frontend data-connected dashboards and work management screens | Implemented |
| Automated tenant isolation verification | Implemented |

## Roadmap

| Status | Milestone |
| --- | --- |
| Done | Backend REST foundation with Supabase Auth and PostgreSQL access. |
| Done | Backend profile, project, task, document, and recommendation services. |
| Done | Frontend foundation, brand system, app shell, and authentication flow. |
| Planned | PDF and DOCX text extraction. |
| Planned | Recommendation review, accept, reject, and override workflow. |
| Planned | Notifications and richer analytics APIs. |
| Done | Baseline production deployment hardening, including environment validation, deployment artifacts, health checks, rate limiting, and request observability. |

## Future Milestones

Near-term work should connect the existing frontend placeholders to the implemented backend APIs, complete PDF/DOCX extraction, and add supervisor review workflows for generated recommendations. Longer-term work should add analytics, notifications, broader observability, and production deployment configuration refinements.

## Contributing

Before changing code, read `CODEX.md` and the relevant `backend/CODEX.md` or `frontend/CODEX.md`.

Expected workflow:

1. Keep backend, frontend, and database responsibilities separate.
2. Keep backend business logic in services.
3. Keep frontend pages as route containers.
4. Route frontend API calls through services.
5. Document only implemented behavior.
6. Run the relevant build and lint commands before opening a change.

## License

No repository-level `LICENSE` file is currently present. The backend package metadata declares `ISC`; confirm the intended project license before publishing.
