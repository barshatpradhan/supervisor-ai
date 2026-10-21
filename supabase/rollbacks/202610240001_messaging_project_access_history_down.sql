-- Rolls back 202610240001_messaging_project_access_history.sql. Not run automatically.
-- Redeploy the previous backend first: the new one calls messaging_task_tagged_message_ids.
--
-- Order matters: the triggers go first, so task writes never touch the functions or table being
-- removed. Then messaging_project_channel_access gets its 202610230001 body back (it must stop
-- reading the table before the table is dropped). No task, message or user data is touched.

begin;

drop trigger if exists messaging_project_access_on_task_insert on public.tasks;
drop trigger if exists messaging_project_access_on_task_update on public.tasks;
drop trigger if exists messaging_project_access_on_task_delete on public.tasks;

drop function if exists public.messaging_sync_project_access();
drop function if exists public.messaging_refresh_project_access(uuid, uuid);
drop function if exists public.messaging_task_tagged_message_ids(uuid, uuid, uuid);

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
  select c.id, c.project_id, min(coalesce(t.assigned_at, t.created_at))
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
  where e.user_id = p_user_id
    and e.organization_id = p_organization_id
    and (p_conversation_id is null or c.id = p_conversation_id)
  group by c.id, c.project_id
$$;

revoke all on function public.messaging_project_channel_access(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.messaging_project_channel_access(uuid, uuid, uuid) to service_role;

drop table if exists public.messaging_project_access;

commit;
