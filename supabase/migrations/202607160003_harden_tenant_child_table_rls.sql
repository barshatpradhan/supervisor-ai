-- Phase 17
-- Harden child-table tenant isolation for resources that inherit ownership
-- through their parent project rather than storing organization_id directly.
-- The application uses backend service-role access for these tables, so
-- authenticated/anon direct table access is revoked instead of broadened.

alter table public.tasks enable row level security;
alter table public.task_progress enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_document_analyses enable row level security;
alter table public.ai_recommendations enable row level security;

revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_progress from anon, authenticated;
revoke all on table public.project_documents from anon, authenticated;
revoke all on table public.project_document_analyses from anon, authenticated;
revoke all on table public.ai_recommendations from anon, authenticated;
