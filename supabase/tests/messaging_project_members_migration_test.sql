-- Test for 202610230001_messaging_project_members.sql. Run ONLY against a disposable copy of the
-- database, never against production. Order of operations tested:
--
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/team_messaging_migration_seed.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610220001_team_messaging.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610230001_messaging_project_members.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610230001_messaging_project_members.sql   -- re-run
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/messaging_project_members_migration_test.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/202610230001_messaging_project_members_down.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610230001_messaging_project_members.sql   -- re-apply
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/messaging_project_members_migration_test.sql
--
-- Everything below runs in one transaction that is rolled back, so the script can be re-run.

begin;

do $$
declare
  org1 constant uuid := '20000000-0000-0000-0000-000000000001';
  org2 constant uuid := '20000000-0000-0000-0000-000000000002';
  p1 constant uuid := '30000000-0000-0000-0000-000000000001';
  p2 constant uuid := '30000000-0000-0000-0000-000000000002';
  p_deleted constant uuid := '30000000-0000-0000-0000-000000000003';
  creator constant uuid := '10000000-0000-0000-0000-000000000001';
  emp_user constant uuid := '10000000-0000-0000-0000-0000000000e1';
  other_user constant uuid := '10000000-0000-0000-0000-0000000000e2';
  emp constant uuid := '40000000-0000-0000-0000-0000000000e1';
  emp_org2 constant uuid := '40000000-0000-0000-0000-0000000000f1';
  t_early constant uuid := '50000000-0000-0000-0000-000000000001';
  t_late constant uuid := '50000000-0000-0000-0000-000000000002';
  c_p1 uuid;
  c_general uuid;
  n int;
  since_value timestamptz;
  rec record;
begin
  -- Functions exist, and only service_role may call them.
  if to_regprocedure('public.messaging_project_channel_access(uuid,uuid,uuid)') is null then
    raise exception 'messaging_project_channel_access missing';
  end if;
  if to_regprocedure('public.messaging_unread_counts_since(uuid,uuid[],timestamptz[])') is null then
    raise exception 'messaging_unread_counts_since missing';
  end if;
  if to_regprocedure('public.messaging_unread_counts(uuid,uuid[],timestamptz)') is null then
    raise exception 'the old messaging_unread_counts must be kept for the deployed backend';
  end if;
  if has_function_privilege('anon', 'public.messaging_project_channel_access(uuid,uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.messaging_project_channel_access(uuid,uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.messaging_unread_counts_since(uuid,uuid[],timestamptz[])', 'execute')
     or has_function_privilege('authenticated', 'public.messaging_unread_counts_since(uuid,uuid[],timestamptz[])', 'execute') then
    raise exception 'anon/authenticated can execute a messaging function';
  end if;
  if not has_function_privilege('service_role', 'public.messaging_project_channel_access(uuid,uuid,uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.messaging_unread_counts_since(uuid,uuid[],timestamptz[])', 'execute') then
    raise exception 'service_role cannot execute a messaging function';
  end if;

  -- Fixture: one employee in org 1, a second person, and an org-2 employee row for the same user.
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000e1', 'emp@x.test'),
    ('00000000-0000-0000-0000-0000000000e2', 'other@x.test');
  insert into public.users (id, auth_user_id, email) values
    (emp_user, '00000000-0000-0000-0000-0000000000e1', 'emp@x.test'),
    (other_user, '00000000-0000-0000-0000-0000000000e2', 'other@x.test');
  insert into public.employees (id, user_id, full_name, organization_id) values
    (emp, emp_user, 'Emp One', org1),
    (emp_org2, emp_user, 'Emp One (org 2)', org2);

  select id into c_p1 from conversations where project_id = p1;
  select id into c_general from conversations where organization_id = org1 and kind = 'general';

  -- No tasks: no project channels.
  select count(*) into n from messaging_project_channel_access(emp_user, org1);
  if n <> 0 then raise exception 'employee without tasks has % channels', n; end if;

  -- Two tasks in P1 (any status), plus tasks that must not count: deleted task, deleted project,
  -- and a task in org 2 when asking about org 1.
  insert into public.tasks (id, project_id, title, created_by_user_id, assigned_employee_id, assigned_at, status) values
    (t_early, p1, 'Early', creator, emp, '2026-01-01T00:00:00Z', 'completed'),
    (t_late, p1, 'Late', creator, emp, '2026-03-01T00:00:00Z', 'in_progress');
  insert into public.tasks (project_id, title, created_by_user_id, assigned_employee_id, assigned_at, deleted_at) values
    (p1, 'Deleted task', creator, emp, '2025-01-01T00:00:00Z', now());
  insert into public.tasks (project_id, title, created_by_user_id, assigned_employee_id, assigned_at) values
    (p_deleted, 'On a deleted project', creator, emp, '2025-01-01T00:00:00Z'),
    (p2, 'Other org', creator, emp_org2, '2025-01-01T00:00:00Z');

  select count(*), min(access_since) into n, since_value from messaging_project_channel_access(emp_user, org1);
  if n <> 1 then raise exception 'expected exactly P1 channel, got %', n; end if;
  if since_value <> '2026-01-01T00:00:00Z' then raise exception 'cutoff should be the earliest live assignment, got %', since_value; end if;

  select * into rec from messaging_project_channel_access(emp_user, org1);
  if rec.conversation_id <> c_p1 or rec.project_id <> p1 then raise exception 'wrong channel returned'; end if;

  -- Single-conversation check.
  select count(*) into n from messaging_project_channel_access(emp_user, org1, c_p1);
  if n <> 1 then raise exception 'single check for P1 failed'; end if;
  select count(*) into n from messaging_project_channel_access(emp_user, org1, c_general);
  if n <> 0 then raise exception 'General must never come back as a project channel'; end if;

  -- Org isolation: the org-2 employee row gives access only in org 2.
  select count(*) into n from messaging_project_channel_access(emp_user, org2);
  if n <> 1 then raise exception 'org 2 access: %', n; end if;
  select count(*) into n from messaging_project_channel_access(emp_user, org2, c_p1);
  if n <> 0 then raise exception 'org 1 channel visible through org 2'; end if;

  -- Unread counts with per-conversation cutoffs.
  insert into messages (conversation_id, organization_id, sender_user_id, body, created_at) values
    (c_p1, org1, other_user, 'before access', '2025-12-01T00:00:00Z'),
    (c_p1, org1, other_user, 'after access', '2026-02-01T00:00:00Z'),
    (c_p1, org1, emp_user, 'my own', '2026-02-02T00:00:00Z'),
    (c_general, org1, other_user, 'general old', '2025-06-01T00:00:00Z');
  insert into message_mentions (message_id, user_id)
    select id, emp_user from messages where body in ('before access', 'after access');

  select unread_count, unread_mentions into rec
  from messaging_unread_counts_since(emp_user, array[c_p1, c_general], array['2026-01-01T00:00:00Z'::timestamptz, null])
  where conversation_id = c_p1;
  if rec.unread_count <> 1 or rec.unread_mentions <> 1 then
    raise exception 'P1 unread with cutoff: % / %', rec.unread_count, rec.unread_mentions;
  end if;

  select unread_count into n
  from messaging_unread_counts_since(emp_user, array[c_p1, c_general], array['2026-01-01T00:00:00Z'::timestamptz, null])
  where conversation_id = c_general;
  if n <> 1 then raise exception 'General with no cutoff should count its message, got %', n; end if;

  -- Unassigning the last live tasks removes access at once.
  update public.tasks set assigned_employee_id = null where id in (t_early, t_late);
  select count(*) into n from messaging_project_channel_access(emp_user, org1);
  if n <> 0 then raise exception 'access kept after unassignment'; end if;

  -- Re-running the migration must not have created data.
  select count(*) into n from conversations where kind = 'project';
  if n <> 2 then raise exception 'project channel count changed: %', n; end if;

  raise notice 'messaging_project_members: all assertions passed';
end $$;

rollback;
