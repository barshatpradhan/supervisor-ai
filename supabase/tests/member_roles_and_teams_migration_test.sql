-- Test for 202610260001_member_roles_and_teams.sql. Run ONLY against a disposable copy of the
-- database, never against production. Order of operations tested:
--
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610260001_member_roles_and_teams.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610260001_member_roles_and_teams.sql   -- re-run
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/member_roles_and_teams_migration_test.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/202610260001_member_roles_and_teams_down.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610260001_member_roles_and_teams.sql   -- re-apply
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/member_roles_and_teams_migration_test.sql
--   bash supabase/tests/member_roles_and_teams_concurrency_test.sh "$DISPOSABLE_DB_URL"
--
-- Everything below runs in one transaction that is rolled back. It builds its own two
-- organizations, so it does not depend on (or change) existing data.

begin;

-- Helpers ----------------------------------------------------------------------------------------

create temporary table ids (key text primary key, id uuid not null) on commit drop;

create function pg_temp.id(p_key text) returns uuid language sql stable as $$
  select id from ids where key = p_key
$$;

-- Runs a statement and returns 'ok', or the error message and (when set) " | " and its DETAIL.
create function pg_temp.try(p_sql text) returns text language plpgsql as $$
declare
  v_message text;
  v_detail text;
begin
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics v_message = message_text, v_detail = pg_exception_detail;
  return v_message || case when coalesce(v_detail, '') <> '' then ' | ' || v_detail else '' end;
end;
$$;

create function pg_temp.eq(p_actual text, p_expected text, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception '%: expected [%], got [%]', p_label, p_expected, p_actual;
  end if;
end;
$$;

create function pg_temp.change(p_actor text, p_member text, p_role text, p_name text default null) returns text
language sql as $$
  select pg_temp.try(format(
    'select * from public.org_change_member_role(%L::uuid, %L::uuid, %L::uuid, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id(p_actor), pg_temp.id('m_' || p_member), p_role, p_name))
$$;

create function pg_temp.role_of(p_member text) returns text language sql as $$
  select role from public.organization_members where id = pg_temp.id('m_' || p_member)
$$;

create function pg_temp.logs(p_event text) returns text language sql as $$
  select count(*)::text from public.activity_logs
  where organization_id in (pg_temp.id('org_a'), pg_temp.id('org_b')) and event_type = p_event
$$;

create function pg_temp.membership(p_actor text, p_employee text, p_from text, p_to text) returns text
language sql as $$
  select pg_temp.try(format(
    'select public.org_change_team_membership(%L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid)',
    pg_temp.id('org_a'), pg_temp.id(p_actor), pg_temp.id('e_' || p_employee), pg_temp.id(p_from), pg_temp.id(p_to)))
$$;

-- Fixture ------------------------------------------------------------------------------------------
-- Organization A: two admins (admin1 has no profile, like an organization's creator; admin2 has a
-- supervisor profile), two supervisors (sup1 leads "Platform"), employees emp1 (an open task),
-- emp2 (only completed, cancelled, deleted or deleted-project work; in "Platform"), emp3 (no work;
-- in "Platform"), an invited employee and a suspended employee with an open task, and a suspended
-- admin. Organization B: one admin, one supervisor, one employee and one team.

do $$
declare
  k text;
  u uuid;
begin
  foreach k in array array['admin1', 'admin2', 'admin_susp', 'sup1', 'sup2', 'emp1', 'emp2', 'emp3',
                           'inv', 'susp', 'admin_b', 'sup_b', 'emp_b'] loop
    insert into public.users (auth_user_id, email) values (gen_random_uuid(), k || '@roles-test.example')
    returning id into u;
    insert into ids values (k, u);
  end loop;

  insert into public.organizations (name, slug, created_by_user_id)
  values ('Roles Test A', 'roles-test-a-' || substr(gen_random_uuid()::text, 1, 8), pg_temp.id('admin1'))
  returning id into u;
  insert into ids values ('org_a', u);
  insert into public.organizations (name, slug, created_by_user_id)
  values ('Roles Test B', 'roles-test-b-' || substr(gen_random_uuid()::text, 1, 8), pg_temp.id('admin_b'))
  returning id into u;
  insert into ids values ('org_b', u);

  -- Memberships: key, organization, role, status.
  for k, u in
    select * from (values
      ('admin1', pg_temp.id('org_a')), ('admin2', pg_temp.id('org_a')), ('admin_susp', pg_temp.id('org_a')),
      ('sup1', pg_temp.id('org_a')), ('sup2', pg_temp.id('org_a')), ('emp1', pg_temp.id('org_a')),
      ('emp2', pg_temp.id('org_a')), ('emp3', pg_temp.id('org_a')), ('inv', pg_temp.id('org_a')),
      ('susp', pg_temp.id('org_a')), ('admin_b', pg_temp.id('org_b')), ('sup_b', pg_temp.id('org_b')),
      ('emp_b', pg_temp.id('org_b'))
    ) as v(key, org)
  loop
    insert into public.organization_members (organization_id, user_id, role, status)
    values (
      u,
      pg_temp.id(k),
      case when k like 'admin%' then 'organization_admin' when k like 'sup%' and k <> 'susp' then 'supervisor' else 'employee' end,
      case k when 'inv' then 'invited' when 'susp' then 'suspended' when 'admin_susp' then 'suspended' else 'active' end
    )
    returning id into u;
    insert into ids values ('m_' || k, u);
  end loop;

  -- Profiles.
  for k in select unnest(array['admin2', 'sup1', 'sup2', 'sup_b']) loop
    insert into public.supervisors (organization_id, user_id, full_name, department, bio)
    values (case when k = 'sup_b' then pg_temp.id('org_b') else pg_temp.id('org_a') end, pg_temp.id(k),
            initcap(k) || ' Name', 'Dept ' || k, 'Bio ' || k)
    returning id into u;
    insert into ids values ('s_' || k, u);
  end loop;
  for k in select unnest(array['emp1', 'emp2', 'emp3', 'inv', 'susp', 'emp_b']) loop
    insert into public.employees (organization_id, user_id, full_name, department, bio)
    values (case when k = 'emp_b' then pg_temp.id('org_b') else pg_temp.id('org_a') end, pg_temp.id(k),
            initcap(k) || ' Name', 'Dept ' || k, 'Bio ' || k)
    returning id into u;
    insert into ids values ('e_' || k, u);
  end loop;

  -- Projects and tasks.
  insert into public.projects (title, created_by_user_id, organization_id)
  values ('Live project', pg_temp.id('admin1'), pg_temp.id('org_a')) returning id into u;
  insert into ids values ('project', u);
  insert into public.projects (title, created_by_user_id, organization_id, deleted_at)
  values ('Deleted project', pg_temp.id('admin1'), pg_temp.id('org_a'), now()) returning id into u;
  insert into ids values ('project_deleted', u);

  insert into public.tasks (project_id, title, status, estimated_hours, assigned_employee_id, created_by_user_id, deleted_at)
  values
    (pg_temp.id('project'), 'emp1 open', 'in_progress', 4, pg_temp.id('e_emp1'), pg_temp.id('admin1'), null),
    (pg_temp.id('project'), 'emp2 done', 'completed', 4, pg_temp.id('e_emp2'), pg_temp.id('admin1'), null),
    (pg_temp.id('project'), 'emp2 cancelled', 'cancelled', 4, pg_temp.id('e_emp2'), pg_temp.id('admin1'), null),
    (pg_temp.id('project'), 'emp2 deleted', 'todo', 4, pg_temp.id('e_emp2'), pg_temp.id('admin1'), now()),
    (pg_temp.id('project_deleted'), 'emp2 in deleted project', 'todo', 4, pg_temp.id('e_emp2'), pg_temp.id('admin1'), null),
    (pg_temp.id('project'), 'susp open', 'todo', 4, pg_temp.id('e_susp'), pg_temp.id('admin1'), null);

  -- Teams.
  insert into public.teams (organization_id, name, lead_supervisor_id)
  values (pg_temp.id('org_a'), 'Platform', pg_temp.id('s_sup1')) returning id into u;
  insert into ids values ('t_platform', u);
  insert into public.teams (organization_id, name) values (pg_temp.id('org_a'), 'Mobile') returning id into u;
  insert into ids values ('t_mobile', u);
  insert into public.teams (organization_id, name, lead_supervisor_id)
  values (pg_temp.id('org_b'), 'Other org team', pg_temp.id('s_sup_b')) returning id into u;
  insert into ids values ('t_other', u);
  insert into public.team_members (team_id, employee_id)
  values (pg_temp.id('t_platform'), pg_temp.id('e_emp2')), (pg_temp.id('t_platform'), pg_temp.id('e_emp3'));
end $$;

-- Shape and privileges ---------------------------------------------------------------------------

do $$
declare
  f text;
begin
  perform pg_temp.eq(
    (select count(*)::text from unnest(array[
      'member_role_changed', 'team_created', 'team_updated', 'team_deleted', 'team_lead_changed',
      'team_member_added', 'team_member_removed', 'team_member_moved', 'task_progress_requested']) as e(v)
     where pg_get_constraintdef((select oid from pg_constraint where conname = 'activity_logs_event_type_check')) like '%' || v || '%'),
    '9', 'event types in the CHECK');

  -- Entry points: service_role only.
  foreach f in array array[
    'public.org_member_role_preview(uuid, uuid, uuid, text)',
    'public.org_change_member_role(uuid, uuid, uuid, text, text)',
    'public.org_create_team(uuid, uuid, text, text, uuid)',
    'public.org_update_team(uuid, uuid, uuid, text, text, boolean, uuid)',
    'public.org_delete_team(uuid, uuid, uuid)',
    'public.org_change_team_membership(uuid, uuid, uuid, uuid, uuid)',
    'public.org_unassignable_open_tasks(uuid)'] loop
    perform pg_temp.eq(has_function_privilege('anon', f, 'execute')::text, 'false', f || ' anon');
    perform pg_temp.eq(has_function_privilege('authenticated', f, 'execute')::text, 'false', f || ' authenticated');
    perform pg_temp.eq(has_function_privilege('service_role', f, 'execute')::text, 'true', f || ' service_role');
  end loop;
  -- Internal helpers: nobody but the owner.
  foreach f in array array[
    'public.org_require_admin(uuid, uuid)', 'public.org_require_lead(uuid, uuid)',
    'public.org_role_change_facts(uuid, uuid, text)'] loop
    perform pg_temp.eq(has_function_privilege('service_role', f, 'execute')::text, 'false', f || ' service_role');
    perform pg_temp.eq(has_function_privilege('anon', f, 'execute')::text, 'false', f || ' anon');
  end loop;
  perform pg_temp.eq(has_table_privilege('anon', 'public.assignable_employees', 'select')::text, 'false', 'view anon');
  perform pg_temp.eq(has_table_privilege('authenticated', 'public.assignable_employees', 'select')::text, 'false', 'view authenticated');
  perform pg_temp.eq(has_table_privilege('service_role', 'public.assignable_employees', 'select')::text, 'true', 'view service_role');

  -- Assignable: active members in the employee role only (not invited, not suspended, not org B).
  perform pg_temp.eq(
    (select string_agg(full_name, ',' order by full_name) from public.assignable_employees
     where organization_id = pg_temp.id('org_a')),
    'Emp1 Name,Emp2 Name,Emp3 Name', 'assignable employees');
end $$;

-- Role changes: preview --------------------------------------------------------------------------

do $$
declare
  v jsonb;
begin
  perform pg_temp.eq(pg_temp.try(format('select public.org_member_role_preview(%L, %L, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id('sup1'), pg_temp.id('m_emp1'), 'supervisor')), 'forbidden', 'preview by a supervisor');
  perform pg_temp.eq(pg_temp.try(format('select public.org_member_role_preview(%L, %L, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_emp_b'), 'supervisor')), 'member_not_found', 'preview across organizations');

  v := public.org_member_role_preview(pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_emp1'), 'supervisor');
  perform pg_temp.eq(v->>'blocked_reason', 'has_open_tasks', 'preview emp1 blocked');
  perform pg_temp.eq(v->>'blocked_detail', '1', 'preview emp1 open tasks');
  perform pg_temp.eq(v->>'needs_profile', 'supervisor', 'preview emp1 needs profile');
  perform pg_temp.eq(v->>'suggested_name', 'Emp1 Name', 'preview emp1 suggested name');

  v := public.org_member_role_preview(pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_emp2'), 'supervisor');
  perform pg_temp.eq(coalesce(v->>'blocked_reason', 'none'), 'none', 'preview emp2 allowed');
  perform pg_temp.eq(v->>'completed_tasks', '1', 'preview emp2 completed tasks');
  perform pg_temp.eq(v->>'teams_member_of', '["Platform"]', 'preview emp2 teams');

  v := public.org_member_role_preview(pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_sup1'), 'employee');
  perform pg_temp.eq(v->>'blocked_reason', 'leads_teams', 'preview sup1 blocked');
  perform pg_temp.eq(v->>'teams_led', '["Platform"]', 'preview sup1 teams led');

  v := public.org_member_role_preview(pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_admin1'), 'supervisor');
  perform pg_temp.eq(coalesce(v->>'suggested_name', 'none'), 'none', 'no name is ever derived from the email');
end $$;

-- Role changes: every branch ---------------------------------------------------------------------

do $$
declare
  logs_before integer;
begin
  logs_before := pg_temp.logs('member_role_changed')::integer;

  -- Refusals.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp3', 'owner'), 'invalid_role', 'unknown role');
  perform pg_temp.eq(pg_temp.change('admin1', 'emp3', null), 'invalid_role', 'null role');
  perform pg_temp.eq(pg_temp.change('sup1', 'emp3', 'supervisor'), 'forbidden', 'supervisor as actor');
  perform pg_temp.eq(pg_temp.change('emp1', 'emp3', 'supervisor'), 'forbidden', 'employee as actor');
  perform pg_temp.eq(pg_temp.change('admin_susp', 'emp3', 'supervisor'), 'forbidden', 'suspended admin as actor');
  perform pg_temp.eq(pg_temp.change('admin_b', 'emp3', 'supervisor'), 'forbidden', 'admin of another organization');
  perform pg_temp.eq(pg_temp.try(format('select * from public.org_change_member_role(%L, %L, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('m_emp_b'), 'supervisor')), 'member_not_found', 'member of another organization');
  perform pg_temp.eq(pg_temp.try(format('select * from public.org_change_member_role(%L, %L, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), gen_random_uuid(), 'supervisor')), 'member_not_found', 'unknown membership');
  perform pg_temp.eq(pg_temp.change('admin1', 'inv', 'supervisor', 'X'), 'member_not_active', 'invited member');
  perform pg_temp.eq(pg_temp.change('admin1', 'susp', 'supervisor', 'X'), 'member_not_active', 'suspended member');
  perform pg_temp.eq(pg_temp.change('admin1', 'emp1', 'supervisor'), 'has_open_tasks | 1', 'employee with an open task to supervisor');
  perform pg_temp.eq(pg_temp.change('admin1', 'emp1', 'organization_admin'), 'has_open_tasks | 1', 'employee with an open task to admin');
  perform pg_temp.eq(pg_temp.change('admin1', 'sup1', 'employee', 'X'), 'leads_teams | Platform', 'team lead to employee');

  -- No change: same role, nothing written.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp3', 'employee'), 'ok', 'same role');
  perform pg_temp.eq(pg_temp.logs('member_role_changed'), logs_before::text, 'same role writes no log');

  -- Employee to supervisor: completed, cancelled, deleted and deleted-project work don't block. The
  -- supervisor profile is created with the employee name when no name is typed.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp2', 'supervisor'), 'ok', 'emp2 to supervisor');
  perform pg_temp.eq(pg_temp.role_of('emp2'), 'supervisor', 'emp2 role');
  perform pg_temp.eq((select full_name || '/' || department || '/' || bio from public.supervisors where user_id = pg_temp.id('emp2')),
    'Emp2 Name/Dept emp2/Bio emp2', 'emp2 supervisor profile copied from the employee profile');
  perform pg_temp.eq((select count(*)::text from public.assignable_employees where id = pg_temp.id('e_emp2')), '0', 'emp2 not assignable');
  perform pg_temp.eq((select count(*)::text from public.team_members where employee_id = pg_temp.id('e_emp2')), '1', 'emp2 team row kept');
  perform pg_temp.eq((select count(*)::text from public.tasks where assigned_employee_id = pg_temp.id('e_emp2')), '4', 'emp2 tasks kept');
  perform pg_temp.eq((select metadata->>'profile_created' from public.activity_logs
    where event_type = 'member_role_changed' and metadata->>'target_user_id' = pg_temp.id('emp2')::text
      and metadata->>'to_role' = 'supervisor'), 'supervisor', 'log records the created profile');

  -- And back: nothing is created, everything is where it was.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp2', 'employee', 'Ignored'), 'ok', 'emp2 back to employee');
  perform pg_temp.eq((select full_name from public.employees where id = pg_temp.id('e_emp2')), 'Emp2 Name', 'emp2 employee profile untouched');
  perform pg_temp.eq((select count(*)::text from public.assignable_employees where id = pg_temp.id('e_emp2')), '1', 'emp2 assignable again');
  perform pg_temp.eq((select count(*)::text from public.supervisors where user_id = pg_temp.id('emp2')), '1', 'emp2 supervisor profile kept');

  -- Supervisor to employee with a typed name; the employee profile copies department and bio.
  perform pg_temp.eq(pg_temp.change('admin1', 'sup2', 'employee', '  Typed Name  '), 'ok', 'sup2 to employee');
  perform pg_temp.eq((select full_name || '/' || department || '/' || bio || '/' || employment_type || '/' || weekly_capacity_hours::int
    from public.employees where user_id = pg_temp.id('sup2')), 'Typed Name/Dept sup2/Bio sup2/full_time/40', 'sup2 employee profile');
  perform pg_temp.eq(pg_temp.change('admin1', 'sup2', 'supervisor'), 'ok', 'sup2 back to supervisor');
  perform pg_temp.eq((select count(*)::text from public.supervisors where user_id = pg_temp.id('sup2')), '1', 'sup2 still one supervisor profile');

  -- A missing profile needs a name: typed, or from the other profile. Never from the email.
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'employee'), 'name_required', 'admin without a profile, no name');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'employee', '   '), 'name_required', 'admin without a profile, blank name');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'employee', repeat('n', 121)), 'invalid_name', 'name over 120 characters');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'supervisor', 'Founder'), 'ok', 'admin1 to supervisor with a name');
  perform pg_temp.eq((select full_name || '/' || coalesce(department, '-') from public.supervisors where user_id = pg_temp.id('admin1')),
    'Founder/-', 'admin1 supervisor profile');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'organization_admin'), 'ok', 'admin1 back to admin');

  -- Becoming an admin creates no profile.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp3', 'organization_admin'), 'ok', 'emp3 to admin');
  perform pg_temp.eq((select count(*)::text from public.supervisors where user_id = pg_temp.id('emp3')), '0', 'no supervisor profile for a new admin');
  perform pg_temp.eq((select count(*)::text from public.assignable_employees where id = pg_temp.id('e_emp3')), '0', 'admin not assignable');
  perform pg_temp.eq(pg_temp.change('emp3', 'emp3', 'employee'), 'ok', 'emp3 steps back down (others remain)');

  -- Last admin: admin1 and admin2 are the active admins (admin_susp is suspended and doesn't count).
  perform pg_temp.eq(pg_temp.change('admin1', 'admin1', 'supervisor'), 'ok', 'self-demotion while another admin remains');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin2', 'employee', 'X'), 'last_admin', 'last admin demotes self');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin2', 'supervisor'), 'last_admin', 'last admin, any role');
  perform pg_temp.eq(pg_temp.change('admin2', 'admin1', 'organization_admin'), 'ok', 'promote admin1 again');
  perform pg_temp.eq(pg_temp.change('admin1', 'admin2', 'supervisor'), 'ok', 'admin1 demotes admin2');
  perform pg_temp.eq(pg_temp.change('admin1', 'admin1', 'employee', 'X'), 'last_admin', 'admin1 is now the last admin');
  perform pg_temp.eq(pg_temp.change('admin1', 'admin2', 'organization_admin'), 'ok', 'admin2 back to admin');

  -- One log per real change: emp2 x2, sup2 x2, admin1 x2, emp3 x2, admin1, admin1, admin2, admin2.
  perform pg_temp.eq(pg_temp.logs('member_role_changed'), (logs_before + 12)::text, 'one log per change');
  perform pg_temp.eq((select count(*)::text from public.activity_logs
    where event_type = 'member_role_changed' and organization_id = pg_temp.id('org_a')
      and actor_user_id = pg_temp.id('admin1') and metadata->>'membership_id' = pg_temp.id('m_admin2')::text
      and metadata->>'target_user_id' = pg_temp.id('admin2')::text
      and metadata->>'from_role' = 'supervisor' and metadata->>'to_role' = 'organization_admin'),
    '1', 'log has who changed whom, from and to');
end $$;

-- Teams ------------------------------------------------------------------------------------------

do $$
declare
  v_data uuid;
  v_result text;
begin
  -- Create.
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, null)',
    pg_temp.id('org_a'), pg_temp.id('sup1'), 'Nope')), 'forbidden', 'create by a supervisor');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), ' platform ')), 'team_name_taken', 'name taken, other case and spaces');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), '   ')), 'invalid_team_name', 'blank name');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), repeat('t', 81))), 'invalid_team_name', 'name over 80 characters');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, null, null, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'))), 'invalid_team_name', 'null name');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), 'X', pg_temp.id('s_sup_b'))), 'invalid_lead', 'lead from another organization');
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, null, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), 'X', (select id from public.supervisors where user_id = pg_temp.id('emp2')))),
    'invalid_lead', 'lead whose role is employee');

  v_data := public.org_create_team(pg_temp.id('org_a'), pg_temp.id('admin1'), ' Data ', '  ', pg_temp.id('s_sup2'));
  perform pg_temp.eq((select name || '/' || coalesce(description, '-') || '/' || (lead_supervisor_id = pg_temp.id('s_sup2'))::text
    from public.teams where id = v_data), 'Data/-/true', 'created team');
  perform pg_temp.eq(pg_temp.logs('team_created'), '1', 'team_created logged');
  insert into ids values ('t_data', v_data);
  perform pg_temp.eq(pg_temp.try(format('select public.org_create_team(%L, %L, %L, %L, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), 'Admins', 'Led by an admin', pg_temp.id('s_admin2'))), 'ok', 'admin with a supervisor profile can lead');

  -- Update.
  perform pg_temp.eq(pg_temp.try(format('select public.org_update_team(%L, %L, %L, %L, null, false, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('t_other'), 'Mine')), 'team_not_found', 'team of another organization');
  perform pg_temp.eq(pg_temp.try(format('select public.org_update_team(%L, %L, %L, %L, null, false, null)',
    pg_temp.id('org_a'), pg_temp.id('sup2'), v_data, 'Mine')), 'forbidden', 'update by a supervisor');
  perform pg_temp.eq(pg_temp.try(format('select public.org_update_team(%L, %L, %L, %L, null, false, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, 'MOBILE')), 'team_name_taken', 'rename to a taken name');
  perform pg_temp.eq(pg_temp.try(format('select public.org_update_team(%L, %L, %L, %L, null, false, null)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, '')), 'invalid_team_name', 'rename to blank');
  perform pg_temp.eq(pg_temp.try(format('select public.org_update_team(%L, %L, %L, null, null, true, %L)',
    pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, pg_temp.id('s_sup_b'))), 'invalid_lead', 'lead from another organization');

  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, 'Data', null, false, null);
  perform pg_temp.eq(pg_temp.logs('team_updated') || '/' || pg_temp.logs('team_lead_changed'), '0/0', 'no-op update logs nothing');
  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, 'Data Platform', 'About data', false, null);
  perform pg_temp.eq((select name || '/' || description from public.teams where id = v_data), 'Data Platform/About data', 'renamed');
  perform pg_temp.eq(pg_temp.logs('team_updated'), '1', 'team_updated logged');
  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, null, '', false, null);
  perform pg_temp.eq((select coalesce(description, '-') from public.teams where id = v_data), '-', 'description cleared');
  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, null, null, true, pg_temp.id('s_admin2'));
  perform pg_temp.eq((select (lead_supervisor_id = pg_temp.id('s_admin2'))::text from public.teams where id = v_data), 'true', 'lead changed');
  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), v_data, null, null, true, null);
  perform pg_temp.eq((select coalesce(lead_supervisor_id::text, 'none') from public.teams where id = v_data), 'none', 'lead cleared');
  perform pg_temp.eq(pg_temp.logs('team_lead_changed'), '2', 'team_lead_changed logged twice');

  -- Membership.
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', null, null), 'invalid_request', 'neither team');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_data', 't_data'), 'invalid_request', 'same team');
  perform pg_temp.eq(pg_temp.membership('sup1', 'emp1', null, 't_data'), 'forbidden', 'add by a supervisor');
  perform pg_temp.eq(pg_temp.membership('admin1', 'susp', null, 't_data'), 'employee_not_found', 'add someone suspended');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp_b', null, 't_data'), 'employee_not_found', 'add someone from another organization');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp_b', 't_other', null), 'employee_not_found', 'remove someone from another organization');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', null, 't_other'), 'team_not_found', 'add to a team of another organization');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', null, 't_data'), 'ok', 'add emp1');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', null, 't_data'), 'already_in_team', 'add twice');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_data', 't_mobile'), 'ok', 'move emp1');
  perform pg_temp.eq((select string_agg(t.name, ',') from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.employee_id = pg_temp.id('e_emp1')), 'Mobile', 'emp1 only in the target team after the move');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_data', 't_mobile'), 'already_in_team', 'move into a team already joined');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_data', 't_platform'), 'not_in_team', 'move from a team not joined');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_mobile', null), 'ok', 'remove emp1');
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp1', 't_mobile', null), 'not_in_team', 'remove twice');
  perform pg_temp.eq(pg_temp.logs('team_member_added') || '/' || pg_temp.logs('team_member_moved') || '/' || pg_temp.logs('team_member_removed'),
    '1/1/1', 'membership logs');

  -- Removing someone who is no longer assignable still works (checked against the plain profile).
  insert into public.team_members (team_id, employee_id) values (pg_temp.id('t_mobile'), pg_temp.id('e_susp'));
  perform pg_temp.eq(pg_temp.membership('admin1', 'susp', 't_mobile', null), 'ok', 'remove a suspended member');
  perform pg_temp.eq(pg_temp.membership('admin1', 'susp', 't_mobile', 't_data'), 'employee_not_found', 'but not move them');

  -- Delete: blocked by any member row, assignable or not, with both counts.
  insert into public.team_members (team_id, employee_id) values (pg_temp.id('t_platform'), pg_temp.id('e_susp'));
  perform pg_temp.eq(pg_temp.try(format('select public.org_delete_team(%L, %L, %L)', pg_temp.id('org_a'), pg_temp.id('admin1'),
    pg_temp.id('t_platform'))), 'team_not_empty | {"active": 2, "inactive": 1}', 'delete a team with members');
  delete from public.team_members where team_id = pg_temp.id('t_platform') and employee_id <> pg_temp.id('e_susp');
  perform pg_temp.eq(pg_temp.try(format('select public.org_delete_team(%L, %L, %L)', pg_temp.id('org_a'), pg_temp.id('admin1'),
    pg_temp.id('t_platform'))), 'team_not_empty | {"active": 0, "inactive": 1}', 'only an inactive member left');
  perform pg_temp.eq(pg_temp.try(format('select public.org_delete_team(%L, %L, %L)', pg_temp.id('org_a'), pg_temp.id('admin1'),
    pg_temp.id('t_other'))), 'team_not_found', 'delete a team of another organization');
  perform pg_temp.eq(pg_temp.try(format('select public.org_delete_team(%L, %L, %L)', pg_temp.id('org_a'), pg_temp.id('sup1'),
    v_data)), 'forbidden', 'delete by a supervisor');
  perform pg_temp.eq(pg_temp.try(format('select public.org_delete_team(%L, %L, %L)', pg_temp.id('org_a'), pg_temp.id('admin1'),
    v_data)), 'ok', 'delete an empty team');
  perform pg_temp.eq((select count(*)::text from public.teams where id = v_data), '0', 'team gone');
  perform pg_temp.eq(pg_temp.logs('team_deleted'), '1', 'team_deleted logged');

  -- A team lead can be demoted once the lead is replaced.
  perform public.org_update_team(pg_temp.id('org_a'), pg_temp.id('admin1'), pg_temp.id('t_platform'), null, null, true, null);
  perform pg_temp.eq(pg_temp.change('admin1', 'sup1', 'employee', 'Sup One'), 'ok', 'former lead to employee');
end $$;

-- All or nothing -------------------------------------------------------------------------------------
-- A temporary trigger makes the last step of each write (its activity log insert) fail. Everything
-- the function did before it must be undone with it.

create function pg_temp.fail_on_event() returns trigger language plpgsql as $$
begin
  if new.event_type in ('member_role_changed', 'team_member_moved') then
    raise exception 'simulated failure in the last step';
  end if;
  return new;
end;
$$;
create trigger simulate_failure before insert on public.activity_logs
  for each row execute function pg_temp.fail_on_event();

do $$
begin
  -- Role change that would also create a supervisor profile.
  perform pg_temp.eq(pg_temp.change('admin1', 'emp3', 'supervisor', 'Rollback Name'),
    'simulated failure in the last step', 'role change fails at the log');
  perform pg_temp.eq(pg_temp.role_of('emp3'), 'employee', 'role unchanged after the failure');
  perform pg_temp.eq((select count(*)::text from public.supervisors where user_id = pg_temp.id('emp3')), '0',
    'no profile left behind after the failure');

  -- Move: the removal from the first team must be undone too.
  insert into public.team_members (team_id, employee_id) values (pg_temp.id('t_mobile'), pg_temp.id('e_emp2'));
  perform pg_temp.eq(pg_temp.membership('admin1', 'emp2', 't_mobile', 't_platform'),
    'simulated failure in the last step', 'move fails at the log');
  perform pg_temp.eq((select string_agg(t.name, ',') from public.team_members tm join public.teams t on t.id = tm.team_id
    where tm.employee_id = pg_temp.id('e_emp2')), 'Mobile', 'still in the first team only after the failure');
end $$;

drop trigger simulate_failure on public.activity_logs;

-- Open tasks of people who can't be assigned --------------------------------------------------------

do $$
begin
  perform pg_temp.eq((select string_agg(task_title || '/' || employee_name || '/' || member_status, ',')
    from public.org_unassignable_open_tasks(pg_temp.id('org_a'))), 'susp open/Susp Name/suspended', 'stranded tasks in A');
  perform pg_temp.eq((select count(*)::text from public.org_unassignable_open_tasks(pg_temp.id('org_b'))), '0', 'none in B');

  raise notice 'member_roles_and_teams: all assertions passed';
end $$;

rollback;
