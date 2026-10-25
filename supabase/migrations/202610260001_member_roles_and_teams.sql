-- Organization-admin management of member roles and teams.
--
-- * Additive: seven new activity_logs event types, one view and nine functions. No table or column
--   changes. Apply after 202610250001_user_avatar_variant.sql.
-- * Every write is one function call, so it runs in one transaction: it fully applies or not at all.
--   The functions run as their owner (security definer), are callable only by service_role (the
--   backend), and re-check inside the transaction that the caller is an active organization_admin
--   of the organization they are given. Ids that belong to another organization are "not found".
-- * Profiles are never deleted by a role change. A missing profile the new role needs (employee or
--   supervisor) is created with the name the admin typed; becoming organization_admin creates none.
-- * assignable_employees decides who can be recommended and assigned: employee profiles of active
--   members whose role is employee. NOTE: "select e.*" is expanded when the view is created, so a
--   column added to public.employees later appears in the view only after it is re-created (re-run
--   this file or "create or replace" the view).
-- * Known race, accepted: task assignment checks assignable_employees in the backend, outside the
--   role-change transaction. An assignment that lands in the same moment as a demotion can leave an
--   open task with someone who is no longer assignable. There is deliberately no trigger on tasks;
--   org_unassignable_open_tasks lists such tasks, and the team page shows them to admins.
-- * Errors are raised with SQLSTATE P0001 and a code as the message (for example 'last_admin'); the
--   backend maps codes to HTTP statuses. DETAIL carries counts or names where useful.
-- * Safe to re-run: the CHECK is dropped and re-added, everything else is "create or replace".
-- * Rollback: supabase/rollbacks/202610260001_member_roles_and_teams_down.sql.

begin;

-- Activity log events ------------------------------------------------------------------------------
-- Dropped and re-added in the same transaction (the 202610220001 pattern), so the table is never
-- left without the check. The first seven values are unchanged.

alter table public.activity_logs drop constraint if exists activity_logs_event_type_check;
alter table public.activity_logs add constraint activity_logs_event_type_check check (event_type in (
  'task_progress_updated',
  'task_completed',
  'project_progress_updated',
  'employee_dashboard_viewed',
  'supervisor_dashboard_viewed',
  'invitation_link_copied',
  'task_progress_requested',
  'member_role_changed',
  'team_created',
  'team_updated',
  'team_deleted',
  'team_lead_changed',
  'team_member_added',
  'team_member_removed',
  'team_member_moved'
));

-- Who can be recommended and assigned ------------------------------------------------------------

create or replace view public.assignable_employees with (security_invoker = true) as
  select e.*
  from public.employees e
  join public.organization_members m
    on m.organization_id = e.organization_id
   and m.user_id = e.user_id
  where m.status = 'active'
    and m.role = 'employee';

revoke all on public.assignable_employees from public, anon, authenticated;
grant select on public.assignable_employees to service_role;

-- Shared checks (not callable from the API) ------------------------------------------------------

create or replace function public.org_require_admin(p_organization_id uuid, p_actor_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = p_actor_user_id
      and status = 'active'
      and role = 'organization_admin'
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
end;
$$;

-- A team lead is a supervisor profile in this organization whose member is active and is a
-- supervisor or an organization_admin. Null (no lead) is allowed.
create or replace function public.org_require_lead(p_organization_id uuid, p_supervisor_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_supervisor_id is not null and not exists (
    select 1
    from public.supervisors s
    join public.organization_members m
      on m.organization_id = s.organization_id
     and m.user_id = s.user_id
    where s.id = p_supervisor_id
      and s.organization_id = p_organization_id
      and m.status = 'active'
      and m.role in ('supervisor', 'organization_admin')
  ) then
    raise exception 'invalid_lead' using errcode = 'P0001';
  end if;
end;
$$;

-- Role changes -------------------------------------------------------------------------------------

-- Everything a role change depends on, and the first rule that blocks it (null when allowed).
-- Shared by the preview and the change itself, so the dialog and the write never disagree.
create or replace function public.org_role_change_facts(
  p_organization_id uuid,
  p_membership_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member public.organization_members%rowtype;
  v_employee public.employees%rowtype;
  v_supervisor public.supervisors%rowtype;
  v_open integer := 0;
  v_completed integer := 0;
  v_led text[] := '{}';
  v_teams text[] := '{}';
  v_other_admins integer;
  v_reason text;
  v_detail text;
  v_needs text;
begin
  select * into v_member
  from public.organization_members
  where id = p_membership_id
    and organization_id = p_organization_id;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;

  select * into v_employee
  from public.employees
  where organization_id = p_organization_id and user_id = v_member.user_id;
  select * into v_supervisor
  from public.supervisors
  where organization_id = p_organization_id and user_id = v_member.user_id;

  if v_employee.id is not null then
    select
      count(*) filter (where t.status not in ('completed', 'cancelled')),
      count(*) filter (where t.status = 'completed')
    into v_open, v_completed
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.assigned_employee_id = v_employee.id
      and t.deleted_at is null
      and p.deleted_at is null;

    select coalesce(array_agg(team.name order by team.name), '{}')
    into v_teams
    from public.team_members tm
    join public.teams team on team.id = tm.team_id
    where tm.employee_id = v_employee.id;
  end if;

  if v_supervisor.id is not null then
    select coalesce(array_agg(team.name order by team.name), '{}')
    into v_led
    from public.teams team
    where team.organization_id = p_organization_id
      and team.lead_supervisor_id = v_supervisor.id;
  end if;

  select count(*) into v_other_admins
  from public.organization_members
  where organization_id = p_organization_id
    and role = 'organization_admin'
    and status = 'active'
    and id <> v_member.id;

  v_needs := case
    when p_new_role = 'employee' and v_employee.id is null then 'employee'
    when p_new_role = 'supervisor' and v_supervisor.id is null then 'supervisor'
  end;

  if p_new_role is null or p_new_role not in ('organization_admin', 'supervisor', 'employee') then
    v_reason := 'invalid_role';
  elsif v_member.status <> 'active' then
    v_reason := 'member_not_active';
  elsif v_member.role = p_new_role then
    v_reason := null;
  elsif v_member.role = 'organization_admin' and v_other_admins = 0 then
    v_reason := 'last_admin';
  elsif v_member.role = 'employee' and v_open > 0 then
    v_reason := 'has_open_tasks';
    v_detail := v_open::text;
  elsif p_new_role = 'employee' and cardinality(v_led) > 0 then
    v_reason := 'leads_teams';
    v_detail := array_to_string(v_led, ', ');
  end if;

  return jsonb_build_object(
    'membership_id', v_member.id,
    'user_id', v_member.user_id,
    'from_role', v_member.role,
    'to_role', p_new_role,
    'status', v_member.status,
    'unchanged', coalesce(v_member.role = p_new_role, false),
    'blocked_reason', v_reason,
    'blocked_detail', v_detail,
    'open_tasks', v_open,
    'completed_tasks', v_completed,
    'teams_led', to_jsonb(v_led),
    'teams_member_of', to_jsonb(v_teams),
    'needs_profile', v_needs,
    -- The other profile's name, to prefill the dialog. Never derived from the email.
    'suggested_name', coalesce(v_employee.full_name, v_supervisor.full_name),
    'employee_profile_id', v_employee.id,
    'supervisor_profile_id', v_supervisor.id
  );
end;
$$;

create or replace function public.org_member_role_preview(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_membership_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.org_require_admin(p_organization_id, p_actor_user_id);
  return public.org_role_change_facts(p_organization_id, p_membership_id, p_new_role);
end;
$$;

-- p_full_name is the name for a profile the new role needs and the member doesn't have yet. When it
-- is null the other profile's name is used; with neither, the change fails with name_required.
create or replace function public.org_change_member_role(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_membership_id uuid,
  p_new_role text,
  p_full_name text default null
)
returns table (out_membership_id uuid, out_user_id uuid, out_from_role text, out_to_role text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_facts jsonb;
  v_user_id uuid;
  v_name text;
begin
  -- One role change at a time per organization, so two admins can't demote each other at once:
  -- the second waits here and then sees the first one's result.
  perform pg_advisory_xact_lock(hashtext('supervisor-ai:org-roles:' || p_organization_id::text)::bigint);
  perform public.org_require_admin(p_organization_id, p_actor_user_id);

  perform 1
  from public.organization_members
  where id = p_membership_id
    and organization_id = p_organization_id
  for update;

  v_facts := public.org_role_change_facts(p_organization_id, p_membership_id, p_new_role);
  if v_facts->>'blocked_reason' is not null then
    raise exception '%', v_facts->>'blocked_reason'
      using errcode = 'P0001', detail = coalesce(v_facts->>'blocked_detail', '');
  end if;

  v_user_id := (v_facts->>'user_id')::uuid;
  if (v_facts->>'unchanged')::boolean then
    return query select p_membership_id, v_user_id, v_facts->>'from_role', v_facts->>'to_role';
    return;
  end if;

  if v_facts->>'needs_profile' is not null then
    v_name := nullif(btrim(coalesce(p_full_name, v_facts->>'suggested_name')), '');
    if v_name is null then
      raise exception 'name_required' using errcode = 'P0001';
    end if;
    if char_length(v_name) > 120 then
      raise exception 'invalid_name' using errcode = 'P0001';
    end if;

    if v_facts->>'needs_profile' = 'employee' then
      insert into public.employees (organization_id, user_id, full_name, department, bio)
      select p_organization_id, v_user_id, v_name, s.department, s.bio
      from (select 1) as one
      left join public.supervisors s
        on s.organization_id = p_organization_id
       and s.user_id = v_user_id
      on conflict (organization_id, user_id) do nothing;
    else
      insert into public.supervisors (organization_id, user_id, full_name, department, bio)
      select p_organization_id, v_user_id, v_name, e.department, e.bio
      from (select 1) as one
      left join public.employees e
        on e.organization_id = p_organization_id
       and e.user_id = v_user_id
      on conflict (organization_id, user_id) do nothing;
    end if;
  end if;

  update public.organization_members
  set role = p_new_role
  where id = p_membership_id;

  insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
  values (
    p_organization_id,
    p_actor_user_id,
    'member_role_changed',
    jsonb_build_object(
      'membership_id', p_membership_id,
      'target_user_id', v_user_id,
      'from_role', v_facts->>'from_role',
      'to_role', p_new_role,
      'profile_created', v_facts->>'needs_profile'
    )
  );

  return query select p_membership_id, v_user_id, v_facts->>'from_role', p_new_role;
end;
$$;

-- Teams --------------------------------------------------------------------------------------------

create or replace function public.org_create_team(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_name text,
  p_description text,
  p_lead_supervisor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  perform public.org_require_admin(p_organization_id, p_actor_user_id);
  perform public.org_require_lead(p_organization_id, p_lead_supervisor_id);

  insert into public.teams (organization_id, name, description, lead_supervisor_id)
  values (p_organization_id, btrim(p_name), nullif(btrim(p_description), ''), p_lead_supervisor_id)
  returning id into v_team_id;

  insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
  values (
    p_organization_id,
    p_actor_user_id,
    'team_created',
    jsonb_build_object('team_id', v_team_id, 'name', btrim(p_name), 'lead_supervisor_id', p_lead_supervisor_id)
  );

  return v_team_id;
exception
  when unique_violation then
    raise exception 'team_name_taken' using errcode = 'P0001';
  when check_violation or not_null_violation then
    raise exception 'invalid_team_name' using errcode = 'P0001';
end;
$$;

-- p_name and p_description: null leaves them unchanged ('' clears the description).
-- p_change_lead: false leaves the lead alone; true sets it to p_lead_supervisor_id (null clears it).
create or replace function public.org_update_team(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_team_id uuid,
  p_name text,
  p_description text,
  p_change_lead boolean,
  p_lead_supervisor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
begin
  perform public.org_require_admin(p_organization_id, p_actor_user_id);

  select * into v_team
  from public.teams
  where id = p_team_id
    and organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'team_not_found' using errcode = 'P0001';
  end if;

  if p_change_lead then
    perform public.org_require_lead(p_organization_id, p_lead_supervisor_id);
  end if;

  update public.teams
  set
    name = coalesce(btrim(p_name), name),
    description = case when p_description is null then description else nullif(btrim(p_description), '') end,
    lead_supervisor_id = case when p_change_lead then p_lead_supervisor_id else lead_supervisor_id end
  where id = v_team.id;

  if (p_name is not null and btrim(p_name) <> v_team.name)
     or (p_description is not null and nullif(btrim(p_description), '') is distinct from v_team.description) then
    insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
    values (
      p_organization_id,
      p_actor_user_id,
      'team_updated',
      jsonb_build_object('team_id', v_team.id, 'from_name', v_team.name, 'to_name', coalesce(btrim(p_name), v_team.name))
    );
  end if;

  if p_change_lead and p_lead_supervisor_id is distinct from v_team.lead_supervisor_id then
    insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
    values (
      p_organization_id,
      p_actor_user_id,
      'team_lead_changed',
      jsonb_build_object(
        'team_id', v_team.id,
        'from_lead_supervisor_id', v_team.lead_supervisor_id,
        'to_lead_supervisor_id', p_lead_supervisor_id
      )
    );
  end if;
exception
  when unique_violation then
    raise exception 'team_name_taken' using errcode = 'P0001';
  when check_violation then
    raise exception 'invalid_team_name' using errcode = 'P0001';
end;
$$;

-- A team can be deleted only when it has no member rows at all, assignable or not. DETAIL says how
-- many are assignable ("active") and how many are not ("inactive"), as JSON.
create or replace function public.org_delete_team(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_total integer;
  v_active integer;
begin
  perform public.org_require_admin(p_organization_id, p_actor_user_id);

  select * into v_team
  from public.teams
  where id = p_team_id
    and organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'team_not_found' using errcode = 'P0001';
  end if;

  select
    count(*),
    count(*) filter (where exists (select 1 from public.assignable_employees a where a.id = tm.employee_id))
  into v_total, v_active
  from public.team_members tm
  where tm.team_id = v_team.id;

  if v_total > 0 then
    raise exception 'team_not_empty' using
      errcode = 'P0001',
      detail = jsonb_build_object('active', v_active, 'inactive', v_total - v_active)::text;
  end if;

  delete from public.teams where id = v_team.id;

  insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
  values (
    p_organization_id,
    p_actor_user_id,
    'team_deleted',
    jsonb_build_object('team_id', v_team.id, 'name', v_team.name)
  );
end;
$$;

-- Add (from null), remove (to null) or move (both) one employee, in one transaction. Adding or
-- moving needs an assignable employee; removing only needs the employee profile, so people who are
-- no longer assignable can still be taken out of a team.
create or replace function public.org_change_team_membership(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_employee_id uuid,
  p_from_team_id uuid,
  p_to_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.org_require_admin(p_organization_id, p_actor_user_id);

  if (p_from_team_id is null and p_to_team_id is null) or p_from_team_id = p_to_team_id then
    raise exception 'invalid_request' using errcode = 'P0001';
  end if;

  if p_to_team_id is not null then
    if not exists (
      select 1 from public.assignable_employees
      where id = p_employee_id and organization_id = p_organization_id
    ) then
      raise exception 'employee_not_found' using errcode = 'P0001';
    end if;
  elsif not exists (
    select 1 from public.employees
    where id = p_employee_id and organization_id = p_organization_id
  ) then
    raise exception 'employee_not_found' using errcode = 'P0001';
  end if;

  -- Lock both teams in a fixed order, so two moves in opposite directions can't deadlock.
  perform 1
  from public.teams
  where organization_id = p_organization_id
    and id in (p_from_team_id, p_to_team_id)
  order by id
  for update;

  if (p_from_team_id is not null and not exists (
        select 1 from public.teams where id = p_from_team_id and organization_id = p_organization_id))
     or (p_to_team_id is not null and not exists (
        select 1 from public.teams where id = p_to_team_id and organization_id = p_organization_id)) then
    raise exception 'team_not_found' using errcode = 'P0001';
  end if;

  if p_to_team_id is not null and exists (
    select 1 from public.team_members where team_id = p_to_team_id and employee_id = p_employee_id
  ) then
    raise exception 'already_in_team' using errcode = 'P0001';
  end if;

  if p_from_team_id is not null then
    delete from public.team_members
    where team_id = p_from_team_id
      and employee_id = p_employee_id;
    if not found then
      raise exception 'not_in_team' using errcode = 'P0001';
    end if;
  end if;

  if p_to_team_id is not null then
    insert into public.team_members (team_id, employee_id)
    values (p_to_team_id, p_employee_id);
  end if;

  insert into public.activity_logs (organization_id, actor_user_id, event_type, metadata)
  values (
    p_organization_id,
    p_actor_user_id,
    case
      when p_from_team_id is null then 'team_member_added'
      when p_to_team_id is null then 'team_member_removed'
      else 'team_member_moved'
    end,
    jsonb_build_object('employee_id', p_employee_id, 'from_team_id', p_from_team_id, 'to_team_id', p_to_team_id)
  );
end;
$$;

-- Open tasks whose assignee is not assignable (left by the race above, or by a suspension). -------

create or replace function public.org_unassignable_open_tasks(p_organization_id uuid)
returns table (
  task_id uuid,
  task_title text,
  task_status text,
  project_id uuid,
  project_title text,
  employee_id uuid,
  employee_name text,
  member_role text,
  member_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.status::text, p.id, p.title, e.id, e.full_name, m.role, m.status
  from public.tasks t
  join public.projects p
    on p.id = t.project_id
   and p.deleted_at is null
  join public.employees e
    on e.id = t.assigned_employee_id
  left join public.organization_members m
    on m.organization_id = e.organization_id
   and m.user_id = e.user_id
  where p.organization_id = p_organization_id
    and t.deleted_at is null
    and t.status not in ('completed', 'cancelled')
    and not exists (select 1 from public.assignable_employees a where a.id = e.id)
  order by p.title, t.title;
$$;

-- Lock down: only the backend (service_role) may call the entry points --------------------------
-- Supabase's default privileges grant every new function to anon, authenticated and service_role,
-- so each grant is revoked explicitly. The three helpers are callable only through the entry points.

revoke all on function public.org_require_admin(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.org_require_lead(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.org_role_change_facts(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.org_member_role_preview(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.org_change_member_role(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.org_create_team(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.org_update_team(uuid, uuid, uuid, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.org_delete_team(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.org_change_team_membership(uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.org_unassignable_open_tasks(uuid) from public, anon, authenticated;

grant execute on function public.org_member_role_preview(uuid, uuid, uuid, text) to service_role;
grant execute on function public.org_change_member_role(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.org_create_team(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.org_update_team(uuid, uuid, uuid, text, text, boolean, uuid) to service_role;
grant execute on function public.org_delete_team(uuid, uuid, uuid) to service_role;
grant execute on function public.org_change_team_membership(uuid, uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.org_unassignable_open_tasks(uuid) to service_role;

commit;
