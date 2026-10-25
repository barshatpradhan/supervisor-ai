-- Read-only checks to run BEFORE applying 202610260001_member_roles_and_teams.sql to production.
-- They need nothing from the migration and change nothing. Run each one in the Supabase SQL Editor.
--
-- After the migration, who can be recommended and assigned work is decided by the
-- assignable_employees view: employee profiles of ACTIVE members whose role is EMPLOYEE. These two
-- queries list who would drop out of the recommendation pool, the assign list and workload figures,
-- and the open work currently assigned to them.

-- 1. Employee profiles that would leave the recommendation pool ------------------------------------
select
  o.name                                    as organization,
  e.full_name                               as employee,
  e.id                                      as employee_id,
  coalesce(m.role, '(no membership)')       as member_role,
  coalesce(m.status, '-')                   as member_status
from public.employees e
join public.organizations o
  on o.id = e.organization_id
left join public.organization_members m
  on m.organization_id = e.organization_id
 and m.user_id = e.user_id
where m.id is null
   or m.status <> 'active'
   or m.role <> 'employee'
order by o.name, e.full_name;

-- 2. Open tasks assigned to them ----------------------------------------------------------------------
-- Open = not completed or cancelled, in a live project, not deleted. After the migration these are
-- listed on the Team page under "Tasks that need a new assignee".
select
  o.name                                    as organization,
  p.title                                   as project,
  t.title                                   as task,
  t.status::text                            as task_status,
  e.full_name                               as assignee,
  coalesce(m.role, '(no membership)')       as member_role,
  coalesce(m.status, '-')                   as member_status
from public.tasks t
join public.projects p
  on p.id = t.project_id
 and p.deleted_at is null
join public.organizations o
  on o.id = p.organization_id
join public.employees e
  on e.id = t.assigned_employee_id
left join public.organization_members m
  on m.organization_id = e.organization_id
 and m.user_id = e.user_id
where t.deleted_at is null
  and t.status not in ('completed', 'cancelled')
  and (m.id is null or m.status <> 'active' or m.role <> 'employee')
order by o.name, p.title, t.title;
