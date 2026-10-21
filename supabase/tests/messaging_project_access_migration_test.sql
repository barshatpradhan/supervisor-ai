-- Test for 202610240001_messaging_project_access_history.sql. Run ONLY against a disposable copy of
-- the database, never against production. Order of operations tested:
--
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/team_messaging_migration_seed.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610220001_team_messaging.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610230001_messaging_project_members.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610240001_messaging_project_access_history.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610240001_messaging_project_access_history.sql   -- re-run
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/messaging_project_access_migration_test.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/202610240001_messaging_project_access_history_down.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610240001_messaging_project_access_history.sql   -- re-apply
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/messaging_project_access_migration_test.sql
--
-- Everything below runs in one transaction that is rolled back, so the script can be re-run.

begin;

do $$
declare
  org1 constant uuid := '20000000-0000-0000-0000-000000000001';
  creator constant uuid := '10000000-0000-0000-0000-000000000001';
  p1 constant uuid := '30000000-0000-0000-0000-000000000001';
  e_user constant uuid := '10000000-0000-0000-0000-0000000000a5';
  f_user constant uuid := '10000000-0000-0000-0000-0000000000a6';
  e constant uuid := '40000000-0000-0000-0000-0000000000a5';
  f constant uuid := '40000000-0000-0000-0000-0000000000a6';
  t1 constant uuid := '50000000-0000-0000-0000-0000000000a1';
  t2 constant uuid := '50000000-0000-0000-0000-0000000000a2';
  t3 constant uuid := '50000000-0000-0000-0000-0000000000a3';
  p_tmp uuid;
  c_p1 uuid;
  c_other uuid;
  m_tag uuid;
  m_other_tag uuid;
  m_plain uuid;
  n int;
  since_value timestamptz;
  def text;
  rec record;
begin
  -- Objects, grants, RLS -------------------------------------------------------------------------
  if to_regclass('public.messaging_project_access') is null then raise exception 'table missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.messaging_project_access'::regclass) then
    raise exception 'RLS is off on messaging_project_access';
  end if;
  if has_table_privilege('anon', 'public.messaging_project_access', 'select')
     or has_table_privilege('authenticated', 'public.messaging_project_access', 'select') then
    raise exception 'anon/authenticated can read messaging_project_access';
  end if;
  if has_function_privilege('authenticated', 'public.messaging_task_tagged_message_ids(uuid,uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.messaging_refresh_project_access(uuid,uuid)', 'execute') then
    raise exception 'a messaging function is callable by anon/authenticated';
  end if;

  -- Each trigger is security definer and fires only on the columns that matter.
  select pg_get_triggerdef(oid) into def from pg_trigger where tgname = 'messaging_project_access_on_task_update';
  if def not like '%AFTER UPDATE OF assigned_employee_id, project_id, deleted_at%' or def not like '%WHEN%' then
    raise exception 'update trigger must be column-limited with a WHEN clause: %', def;
  end if;
  select count(*) into n from pg_trigger where tgname like 'messaging_project_access_on_task_%' and tgqual is not null;
  if n <> 3 then raise exception 'all three task triggers need a WHEN clause, found %', n; end if;
  if not (select prosecdef from pg_proc where oid = 'public.messaging_sync_project_access()'::regprocedure) then
    raise exception 'trigger function must be security definer';
  end if;

  -- Backfill matches live tasks exactly ---------------------------------------------------------
  select count(*) into n from (
    (select distinct assigned_employee_id, project_id from tasks where assigned_employee_id is not null and deleted_at is null)
    except
    (select employee_id, project_id from messaging_project_access)
  ) missing;
  if n <> 0 then raise exception 'backfill missing % rows', n; end if;

  -- Fixture --------------------------------------------------------------------------------------
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a5', 'e@x.test'), ('00000000-0000-0000-0000-0000000000a6', 'f@x.test');
  insert into public.users (id, auth_user_id, email) values
    (e_user, '00000000-0000-0000-0000-0000000000a5', 'e@x.test'),
    (f_user, '00000000-0000-0000-0000-0000000000a6', 'f@x.test');
  insert into public.employees (id, user_id, full_name, organization_id) values
    (e, e_user, 'Emp E', org1), (f, f_user, 'Emp F', org1);
  select id into c_p1 from conversations where project_id = p1;

  -- First assignment creates the row ------------------------------------------------------------
  insert into tasks (id, project_id, title, created_by_user_id, assigned_employee_id, assigned_at)
  values (t1, p1, 'T1', creator, e, '2026-01-01Z');
  select access_since into since_value from messaging_project_access where employee_id = e and project_id = p1;
  if since_value <> '2026-01-01Z' then raise exception 'first assignment: %', since_value; end if;

  -- A second task does not move the date; losing the earlier one does not move it forward.
  insert into tasks (id, project_id, title, created_by_user_id, assigned_employee_id, assigned_at)
  values (t2, p1, 'T2', creator, e, '2026-03-01Z');
  update tasks set assigned_employee_id = f, assigned_at = now() where id = t1;
  select access_since into since_value from messaging_project_access where employee_id = e and project_id = p1;
  if since_value <> '2026-01-01Z' then raise exception 'partial reassignment moved the date to %', since_value; end if;
  select access_since into since_value from messaging_project_channel_access(e_user, org1, c_p1);
  if since_value <> '2026-01-01Z' then raise exception 'access function cutoff moved to %', since_value; end if;
  if not exists (select 1 from messaging_project_access where employee_id = f and project_id = p1) then
    raise exception 'new assignee got no access row';
  end if;

  -- Status, progress-like and title updates leave the row alone.
  update tasks set status = 'completed', title = 'T2 done', completed_at = now() where id = t2;
  select access_since into since_value from messaging_project_access where employee_id = e and project_id = p1;
  if since_value <> '2026-01-01Z' then raise exception 'status update changed the date'; end if;

  -- Losing the last task removes the row; coming back starts a new date.
  update tasks set deleted_at = now() where id = t2;
  if exists (select 1 from messaging_project_access where employee_id = e and project_id = p1) then
    raise exception 'row kept after the last live task was deleted';
  end if;
  select count(*) into n from messaging_project_channel_access(e_user, org1, c_p1);
  if n <> 0 then raise exception 'access kept after losing every task'; end if;
  update tasks set assigned_employee_id = e, assigned_at = '2026-06-01Z' where id = t1;
  select access_since into since_value from messaging_project_access where employee_id = e and project_id = p1;
  if since_value <> '2026-06-01Z' then raise exception 'regained access should start a new date, got %', since_value; end if;

  -- Tagged-message lookup -------------------------------------------------------------------------
  select id into c_other from conversations where organization_id = org1 and kind = 'general';
  insert into messages (conversation_id, organization_id, sender_user_id, body, created_at)
    values (c_p1, org1, creator, 'About T1', '2025-12-01Z') returning id into m_tag;
  insert into message_task_refs (message_id, organization_id, task_id) values (m_tag, org1, t1);
  insert into messages (conversation_id, organization_id, sender_user_id, body, created_at)
    values (c_p1, org1, creator, 'Plain', '2025-12-02Z') returning id into m_plain;
  insert into tasks (id, project_id, title, created_by_user_id, assigned_employee_id) values (t3, p1, 'T3', creator, f);
  insert into messages (conversation_id, organization_id, sender_user_id, body) values (c_p1, org1, creator, 'About T3')
    returning id into m_other_tag;
  insert into message_task_refs (message_id, organization_id, task_id) values (m_other_tag, org1, t3);

  select count(*) into n from messaging_task_tagged_message_ids(e_user, org1, c_p1);
  if n <> 1 or not exists (select 1 from messaging_task_tagged_message_ids(e_user, org1, c_p1) where message_id = m_tag) then
    raise exception 'E should see exactly the message tagging T1';
  end if;
  select count(*) into n from messaging_task_tagged_message_ids(e_user, org1, c_other);
  if n <> 0 then raise exception 'tag lookup must be limited to the given project channel'; end if;
  select count(*) into n from messaging_task_tagged_message_ids(e_user, '20000000-0000-0000-0000-000000000002', c_p1);
  if n <> 0 then raise exception 'tag lookup crossed organizations'; end if;
  update messages set body = '', deleted_at = now() where id = m_tag;
  select count(*) into n from messaging_task_tagged_message_ids(e_user, org1, c_p1);
  if n <> 0 then raise exception 'deleted messages must not be returned'; end if;

  -- Bulk update: every task in the project moves to F in one statement.
  update tasks set assigned_employee_id = f, assigned_at = now() where project_id = p1 and deleted_at is null;
  if exists (select 1 from messaging_project_access where employee_id = e and project_id = p1) then
    raise exception 'bulk reassignment left E with access';
  end if;
  if not exists (select 1 from messaging_project_access where employee_id = f and project_id = p1) then
    raise exception 'bulk reassignment gave F no access';
  end if;

  -- A failing access write never blocks the task write (it is raised as a WARNING instead).
  alter table messaging_project_access add constraint test_reject_all check (access_since < '2000-01-01') not valid;
  insert into tasks (project_id, title, created_by_user_id, assigned_employee_id, assigned_at)
  values (p1, 'Written while access bookkeeping fails', creator, e, now());
  if not exists (select 1 from tasks where title = 'Written while access bookkeeping fails') then
    raise exception 'task write was blocked';
  end if;
  alter table messaging_project_access drop constraint test_reject_all;

  -- The refresh function tolerates ids that no longer exist.
  perform messaging_refresh_project_access(gen_random_uuid(), gen_random_uuid());
  perform messaging_refresh_project_access(null, p1);

  -- Hard deletes with tasks and access rows never fail ---------------------------------------------
  insert into projects (title, organization_id, created_by_user_id) values ('Temp', org1, creator) returning id into p_tmp;
  insert into tasks (project_id, title, created_by_user_id, assigned_employee_id) values (p_tmp, 'Temp task', creator, f);
  delete from projects where id = p_tmp;                                   -- project with tasks
  if exists (select 1 from messaging_project_access where project_id = p_tmp) then raise exception 'project delete left a row'; end if;

  delete from employees where id = e;                                      -- employee with tasks (set null)
  if exists (select 1 from messaging_project_access where employee_id = e) then raise exception 'employee delete left a row'; end if;

  delete from users where id = f_user;                                     -- user -> employee cascade
  if exists (select 1 from messaging_project_access where employee_id = f) then raise exception 'user delete left a row'; end if;

  insert into employees (id, user_id, full_name, organization_id) values (e, e_user, 'Emp E again', org1);
  insert into tasks (project_id, title, created_by_user_id, assigned_employee_id) values (p1, 'Before org delete', creator, e);
  delete from organizations where id = org1;                               -- organization with everything
  select count(*) into n from messaging_project_access a join projects p on p.id = a.project_id where p.organization_id = org1;
  if n <> 0 then raise exception 'organization delete left rows'; end if;

  raise notice 'messaging_project_access: all assertions passed';
end $$;

-- A failing refresh never blocks a task INSERT, UPDATE or DELETE. The refresh function is replaced
-- with one that always raises (undone by the rollback below); each write must still succeed, and
-- psql shows one "messaging_sync_project_access skipped" WARNING per write.
do $$
declare
  org2 constant uuid := '20000000-0000-0000-0000-000000000002';
  p2 constant uuid := '30000000-0000-0000-0000-000000000002';
  creator constant uuid := '10000000-0000-0000-0000-000000000001';
  emp constant uuid := '40000000-0000-0000-0000-0000000000a7';
  failing_task uuid;
  n int;
begin
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'h@x.test');
  insert into public.users (id, auth_user_id, email)
    values ('10000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a7', 'h@x.test');
  insert into public.employees (id, user_id, full_name, organization_id)
    values (emp, '10000000-0000-0000-0000-0000000000a7', 'Emp H', org2);

  execute $f$
    create or replace function public.messaging_refresh_project_access(p_employee_id uuid, p_project_id uuid)
    returns void language plpgsql as $body$
    begin
      raise exception 'forced refresh failure (test)';
    end;
    $body$
  $f$;

  -- INSERT
  insert into tasks (project_id, title, created_by_user_id, assigned_employee_id, assigned_at)
  values (p2, 'Insert while refresh fails', creator, emp, now())
  returning id into failing_task;
  select count(*) into n from tasks where id = failing_task;
  if n <> 1 then raise exception 'task INSERT was blocked by the trigger'; end if;

  -- UPDATE (a column the trigger watches)
  update tasks set assigned_employee_id = null where id = failing_task;
  select count(*) into n from tasks where id = failing_task and assigned_employee_id is null;
  if n <> 1 then raise exception 'task UPDATE was blocked by the trigger'; end if;

  -- DELETE (re-assign first so the delete trigger's WHEN clause fires)
  update tasks set assigned_employee_id = emp where id = failing_task;
  delete from tasks where id = failing_task;
  select count(*) into n from tasks where id = failing_task;
  if n <> 0 then raise exception 'task DELETE was blocked by the trigger'; end if;

  raise notice 'messaging_project_access: task writes succeed while the refresh fails';
end $$;

rollback;
