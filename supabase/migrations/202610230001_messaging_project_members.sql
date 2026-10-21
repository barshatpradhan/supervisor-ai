-- Team messaging: let employees into the channels of projects they work on.
--
-- * Additive only: two new functions, no tables, columns, constraints or data changes.
--   messaging_unread_counts (202610220001) is kept unchanged, so a backend deployed before this
--   migration keeps working.
-- * An employee is on a project while at least one non-deleted task in that live project is
--   assigned to them, in any status. Nothing is stored: access is computed on every request.
-- * access_since is the earliest assigned_at among those tasks. Employees see project channel
--   messages from then on; admins and supervisors keep the full history.
-- * Safe to re-run ("create or replace", revoke/grant are idempotent).
-- * Rollback: supabase/rollbacks/202610230001_messaging_project_members_down.sql.

begin;

-- The project channels an employee may use, with the moment their access began. Pass
-- p_conversation_id to check one conversation; leave it null to list them all.
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

-- Unread and mention counts with a separate cutoff per conversation. The caller passes only
-- conversation ids it has already authorized, each with that viewer's cutoff (null = none).
create or replace function public.messaging_unread_counts_since(
  p_user_id uuid,
  p_conversation_ids uuid[],
  p_since timestamptz[]
)
returns table (conversation_id uuid, unread_count bigint, unread_mentions bigint)
language sql
stable
set search_path = public
as $$
  select
    m.conversation_id,
    count(*)::bigint,
    count(*) filter (
      where exists (
        select 1 from public.message_mentions mm
        where mm.message_id = m.id and mm.user_id = p_user_id
      )
    )::bigint
  from unnest(p_conversation_ids, p_since) as s(conversation_id, since)
  join public.messages m on m.conversation_id = s.conversation_id
  left join public.conversation_reads r
    on r.conversation_id = m.conversation_id and r.user_id = p_user_id
  where m.deleted_at is null
    and m.sender_user_id is distinct from p_user_id
    and (r.last_read_at is null or m.created_at > r.last_read_at)
    and (s.since is null or m.created_at > s.since)
  group by m.conversation_id
$$;

revoke all on function public.messaging_project_channel_access(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.messaging_unread_counts_since(uuid, uuid[], timestamptz[]) from public, anon, authenticated;
grant execute on function public.messaging_project_channel_access(uuid, uuid, uuid) to service_role;
grant execute on function public.messaging_unread_counts_since(uuid, uuid[], timestamptz[]) to service_role;

commit;
