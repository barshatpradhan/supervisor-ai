-- Production query paths: tenant context, dashboard filtering, and document lookup.
create index if not exists organization_members_user_organization_active_idx
  on public.organization_members (user_id, organization_id)
  where status = 'active';
create index if not exists projects_organization_updated_idx
  on public.projects (organization_id, updated_at desc)
  where deleted_at is null;
create index if not exists tasks_project_status_idx
  on public.tasks (project_id, status)
  where deleted_at is null;
create index if not exists task_progress_task_created_idx
  on public.task_progress (task_id, created_at desc);
create index if not exists project_documents_project_created_idx
  on public.project_documents (project_id, created_at desc);
