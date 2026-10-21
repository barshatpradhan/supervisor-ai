-- Rolls back 202610220001_team_messaging.sql. Not run automatically.
--
-- WARNING: this permanently deletes every conversation, message, reaction and read marker,
-- and every task_progress_requested activity entry. Take a backup first.

begin;

drop trigger if exists messaging_general_channel_on_organization on public.organizations;
drop trigger if exists messaging_project_channel_on_project on public.projects;
drop function if exists public.messaging_create_general_channel();
drop function if exists public.messaging_create_project_channel();
drop function if exists public.messaging_unread_counts(uuid, uuid[], timestamptz);

drop table if exists public.conversation_reads;
drop table if exists public.message_reactions;
drop table if exists public.message_mentions;
drop table if exists public.message_task_refs;
drop table if exists public.messages;
drop table if exists public.conversation_participants;
drop table if exists public.conversations;

-- The previous check (202610190001) does not allow task_progress_requested.
delete from public.activity_logs where event_type = 'task_progress_requested';

alter table public.activity_logs
  drop constraint if exists activity_logs_event_type_check;

alter table public.activity_logs
  add constraint activity_logs_event_type_check check (event_type in (
    'task_progress_updated',
    'task_completed',
    'project_progress_updated',
    'employee_dashboard_viewed',
    'supervisor_dashboard_viewed',
    'invitation_link_copied'
  ));

commit;
