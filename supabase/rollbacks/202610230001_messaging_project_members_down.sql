-- Rolls back 202610230001_messaging_project_members.sql. Not run automatically.
-- Drops only the two functions; no data is touched. Redeploy the previous backend first,
-- because the new one calls these functions.

begin;

drop function if exists public.messaging_unread_counts_since(uuid, uuid[], timestamptz[]);
drop function if exists public.messaging_project_channel_access(uuid, uuid, uuid);

commit;
