-- Employee task execution, persisted project progress, and tenant-scoped audit events.
alter table public.projects
  add column if not exists progress_percentage numeric(5, 2) not null default 0
  check (progress_percentage between 0 and 100);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_type text not null check (event_type in (
    'task_progress_updated', 'task_completed', 'project_progress_updated',
    'employee_dashboard_viewed', 'supervisor_dashboard_viewed'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_organization_created_at_idx
  on public.activity_logs (organization_id, created_at desc);
create index if not exists activity_logs_task_created_at_idx
  on public.activity_logs (task_id, created_at desc) where task_id is not null;
create index if not exists tasks_assignee_status_due_date_idx
  on public.tasks (assigned_employee_id, status, due_date) where deleted_at is null;

alter table public.activity_logs enable row level security;
revoke all on table public.activity_logs from anon, authenticated;
