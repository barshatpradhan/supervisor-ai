-- Test for 202610220001_team_messaging.sql. Run ONLY against a disposable copy of the database
-- with every earlier migration applied, never against production:
--
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/team_messaging_migration_seed.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202610220001_team_messaging.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202610220001_team_messaging.sql   -- re-run: must change nothing
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/team_messaging_migration_test.sql
--
-- The seed creates 2 organizations, 2 live projects and 1 soft-deleted project, plus one activity row of
-- every existing event type. The assertions roll back at the end, so the script can be re-run.

begin;

do $$ declare g int; p int; begin
  select count(*) filter (where kind='general'), count(*) filter (where kind='project') into g, p from conversations;
  raise notice 'after re-run: general=% project=%', g, p;
  if g <> 2 or p <> 2 then raise exception 'backfill not idempotent'; end if; end $$;

do $$
declare n int; ok boolean;
begin
  select count(*) into n from conversations where kind='general'; if n <> 2 then raise exception 'general channels: %', n; end if;
  select count(*) into n from conversations where kind='project'; if n <> 2 then raise exception 'project channels (deleted project must be skipped): %', n; end if;
  select count(*) into n from activity_logs; if n <> 6 then raise exception 'activity rows lost: %', n; end if;
  -- triggers
  insert into organizations (id, name, slug, created_by_user_id) values ('20000000-0000-0000-0000-000000000009','New','new-org','10000000-0000-0000-0000-000000000001');
  select count(*) into n from conversations where organization_id='20000000-0000-0000-0000-000000000009' and kind='general'; if n <> 1 then raise exception 'org trigger: %', n; end if;
  insert into projects (id, title, organization_id, created_by_user_id) values ('30000000-0000-0000-0000-000000000009','New P','20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000001');
  select count(*) into n from conversations where project_id='30000000-0000-0000-0000-000000000009'; if n <> 1 then raise exception 'project trigger: %', n; end if;
  -- new event type accepted, unknown rejected
  insert into activity_logs (organization_id, event_type) values ('20000000-0000-0000-0000-000000000001','task_progress_requested');
  begin insert into activity_logs (organization_id, event_type) values ('20000000-0000-0000-0000-000000000001','bogus'); raise exception 'bogus event accepted';
  exception when check_violation then null; end;
  -- body rules
  begin insert into messages (conversation_id, organization_id, body) select id, organization_id, '   ' from conversations limit 1; raise exception 'blank body accepted';
  exception when check_violation then null; end;
  begin insert into messages (conversation_id, organization_id, body) select id, organization_id, repeat('x', 4001) from conversations limit 1; raise exception '4001 chars accepted';
  exception when check_violation then null; end;
  begin insert into messages (conversation_id, organization_id, body, deleted_at) select id, organization_id, 'secret', now() from conversations limit 1; raise exception 'deleted row kept text';
  exception when check_violation then null; end;
  -- duplicate DM key rejected
  insert into conversations (organization_id, kind, direct_key) values ('20000000-0000-0000-0000-000000000001','direct','a:b');
  begin insert into conversations (organization_id, kind, direct_key) values ('20000000-0000-0000-0000-000000000001','direct','a:b'); raise exception 'duplicate DM';
  exception when unique_violation then null; end;
  -- grants
  select has_table_privilege('anon','public.messages','select') or has_table_privilege('authenticated','public.messages','insert') into ok; if ok then raise exception 'anon/authenticated still have grants'; end if;
  select has_function_privilege('authenticated','public.messaging_unread_counts(uuid,uuid[],timestamptz)','execute') into ok; if ok then raise exception 'authenticated can run unread fn'; end if;
  select relrowsecurity into ok from pg_class where oid='public.messages'::regclass; if not ok then raise exception 'RLS off'; end if;
  raise notice 'ALL MIGRATION ASSERTIONS PASSED';
end $$;

rollback;
