-- Rolls back 202610260001_member_roles_and_teams.sql. Not run automatically.
-- Redeploy the previous backend first: the new one calls these functions and reads the view.
-- Roles, profiles and teams changed while it was live stay as they are (they are ordinary rows);
-- only the functions and the view go.

begin;

drop function if exists public.org_unassignable_open_tasks(uuid);
drop function if exists public.org_change_team_membership(uuid, uuid, uuid, uuid, uuid);
drop function if exists public.org_delete_team(uuid, uuid, uuid);
drop function if exists public.org_update_team(uuid, uuid, uuid, text, text, boolean, uuid);
drop function if exists public.org_create_team(uuid, uuid, text, text, uuid);
drop function if exists public.org_change_member_role(uuid, uuid, uuid, text, text);
drop function if exists public.org_member_role_preview(uuid, uuid, uuid, text);
drop function if exists public.org_role_change_facts(uuid, uuid, text);
drop function if exists public.org_require_lead(uuid, uuid);
drop function if exists public.org_require_admin(uuid, uuid);
drop view if exists public.assignable_employees;

-- Back to the previous seven event types. NOT VALID keeps the audit rows already written with the
-- new types instead of deleting them; new rows must use the old list again.
alter table public.activity_logs drop constraint if exists activity_logs_event_type_check;
alter table public.activity_logs add constraint activity_logs_event_type_check check (event_type in (
  'task_progress_updated',
  'task_completed',
  'project_progress_updated',
  'employee_dashboard_viewed',
  'supervisor_dashboard_viewed',
  'invitation_link_copied',
  'task_progress_requested'
)) not valid;

commit;
