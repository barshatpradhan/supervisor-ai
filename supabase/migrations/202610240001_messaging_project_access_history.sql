-- Team messaging: keep an employee's project-channel access date stable, and let a new assignee
-- read earlier messages that tag their task. Apply after 202610230001_messaging_project_members.sql.
--
-- * Additive: one new table, three new functions, three new triggers on public.tasks, and a new body
--   (same signature) for messaging_project_channel_access from 202610230001.
-- * messaging_project_access stores when each employee's continuous access to a project began. A row
--   exists while the employee has at least one live task in the project; it is created when the
--   first one is assigned and deleted when the last one goes. Losing one of several tasks never
--   moves the date forward. Losing all of them and coming back starts a new date.
-- * The triggers sit on the task write path, so they can never block a task write: they fire only
--   when assigned_employee_id, project_id or deleted_at change; inserts are skipped when the
--   employee or project row is gone (cascading deletes); and any error is caught and raised as a
--   WARNING instead. If a row is ever missed, messaging_project_channel_access falls back to the
--   earliest live assignment, and access itself still requires a live task on every request.
-- * Safe to re-run: "if not exists", "create or replace", triggers dropped and re-created, and the
--   backfill uses "on conflict do nothing".
-- * Rollback: supabase/rollbacks/202610240001_messaging_project_access_history_down.sql.

begin;

-- Access history ---------------------------------------------------------------------------------

create table if not exists public.messaging_project_access (
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  access_since timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (employee_id, project_id)
);

create index if not exists messaging_project_access_project_idx
  on public.messaging_project_access (project_id);

-- Brings one (employee, project) row in line with the employee's live tasks in that project.
create or replace function public.messaging_refresh_project_access(p_employee_id uuid, p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if p_employee_id is null or p_project_id is null then
    return;
  end if;

  select min(coalesce(t.assigned_at, t.created_at))
    into v_since
  from public.tasks t
  where t.assigned_employee_id = p_employee_id
    and t.project_id = p_project_id
    and t.deleted_at is null;

  if v_since is null then
    delete from public.messaging_project_access
    where employee_id = p_employee_id and project_id = p_project_id;
  else
    -- An existing row is kept as is, so the date never moves forward while access continues.
    -- The exists checks keep this FK-safe while an employee or project is being deleted.
    insert into public.messaging_project_access (employee_id, project_id, access_since)
    select p_employee_id, p_project_id, v_since
    where exists (select 1 from public.employees e where e.id = p_employee_id)
      and exists (select 1 from public.projects p where p.id = p_project_id)
    on conflict (employee_id, project_id) do nothing;
  end if;
end;
$$;

create or replace function public.messaging_sync_project_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.messaging_refresh_project_access(old.assigned_employee_id, old.project_id);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.messaging_refresh_project_access(new.assigned_employee_id, new.project_id);
    end if;
  exception when others then
    -- Never block a task write over messaging bookkeeping. Only read the row variable that is
    -- assigned for this operation: NEW is unassigned in a DELETE trigger, OLD in an INSERT one.
    raise warning 'messaging_sync_project_access skipped for task %: % (SQLSTATE %)',
      case when tg_op = 'DELETE' then old.id else new.id end, sqlerrm, sqlstate;
  end;
  return null;
end;
$$;

drop trigger if exists messaging_project_access_on_task_insert on public.tasks;
create trigger messaging_project_access_on_task_insert
after insert on public.tasks
for each row
when (new.assigned_employee_id is not null)
execute function public.messaging_sync_project_access();

drop trigger if exists messaging_project_access_on_task_update on public.tasks;
create trigger messaging_project_access_on_task_update
after update of assigned_employee_id, project_id, deleted_at on public.tasks
for each row
when (
  old.assigned_employee_id is distinct from new.assigned_employee_id
  or old.project_id is distinct from new.project_id
  or old.deleted_at is distinct from new.deleted_at
)
execute function public.messaging_sync_project_access();

drop trigger if exists messaging_project_access_on_task_delete on public.tasks;
create trigger messaging_project_access_on_task_delete
after delete on public.tasks
for each row
when (old.assigned_employee_id is not null)
execute function public.messaging_sync_project_access();

-- Backfill (idempotent): one row per (assigned employee, project) with a live task today.
insert into public.messaging_project_access (employee_id, project_id, access_since)
select t.assigned_employee_id, t.project_id, min(coalesce(t.assigned_at, t.created_at))
from public.tasks t
where t.assigned_employee_id is not null
  and t.deleted_at is null
group by t.assigned_employee_id, t.project_id
on conflict (employee_id, project_id) do nothing;

-- Access check: same signature and rules as 202610230001, now using the stored date ---------------

create or replace function public.messaging_project_channel_access(
  p_user_id uuid,
  p_organization_id uuid,
  p_conversation_id uuid default null
)
returns table (conversation_id uuid, project_id uuid, access_since timestamptz)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.project_id,
    -- The stored start of continuous access; the earliest live assignment if no row exists yet.
    coalesce(min(a.access_since), min(coalesce(t.assigned_at, t.created_at)))
  from public.employees e
  join public.tasks t
    on t.assigned_employee_id = e.id
   and t.deleted_at is null
  join public.projects p
    on p.id = t.project_id
   and p.organization_id = p_organization_id
   and p.deleted_at is null
  join public.conversations c
    on c.project_id = p.id
   and c.kind = 'project'
   and c.organization_id = p_organization_id
  left join public.messaging_project_access a
    on a.employee_id = e.id
   and a.project_id = p.id
  where e.user_id = p_user_id
    and e.organization_id = p_organization_id
    and (p_conversation_id is null or c.id = p_conversation_id)
  group by c.id, c.project_id
$$;

-- Earlier messages about the caller's own tasks ---------------------------------------------------
-- Messages in one project channel that tag a live task of that project currently assigned to the
-- caller. The backend shows these to an employee even when they predate their access date.

create or replace function public.messaging_task_tagged_message_ids(
  p_user_id uuid,
  p_organization_id uuid,
  p_conversation_id uuid
)
returns table (message_id uuid)
language sql
stable
set search_path = public
as $$
  select r.message_id
  from public.conversations c
  join public.messages m
    on m.conversation_id = c.id
   and m.organization_id = p_organization_id
   and m.deleted_at is null
  join public.message_task_refs r
    on r.message_id = m.id
  join public.tasks t
    on t.id = r.task_id
   and t.project_id = c.project_id
   and t.deleted_at is null
  join public.employees e
    on e.id = t.assigned_employee_id
   and e.organization_id = p_organization_id
  where c.id = p_conversation_id
    and c.kind = 'project'
    and c.organization_id = p_organization_id
    and e.user_id = p_user_id
$$;

-- Lock down ---------------------------------------------------------------------------------------

alter table public.messaging_project_access enable row level security;
revoke all on table public.messaging_project_access from anon, authenticated;

revoke all on function public.messaging_refresh_project_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.messaging_sync_project_access() from public, anon, authenticated;
revoke all on function public.messaging_task_tagged_message_ids(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.messaging_project_channel_access(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.messaging_task_tagged_message_ids(uuid, uuid, uuid) to service_role;
grant execute on function public.messaging_project_channel_access(uuid, uuid, uuid) to service_role;

commit;
