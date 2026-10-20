-- Audit admins issuing a shareable invitation link (used when email delivery fails).
-- Adds one allowed value to activity_logs.event_type; existing rows are unaffected.
alter table public.activity_logs
  drop constraint if exists activity_logs_event_type_check;

alter table public.activity_logs
  add constraint activity_logs_event_type_check check (event_type in (
    'task_progress_updated', 'task_completed', 'project_progress_updated',
    'employee_dashboard_viewed', 'supervisor_dashboard_viewed',
    'invitation_link_copied'
  ));
