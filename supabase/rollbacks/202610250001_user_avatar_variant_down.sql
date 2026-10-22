-- Rolls back 202610250001_user_avatar_variant.sql. Not run automatically.
-- Redeploy the previous backend first: the new one reads and writes users.avatar_variant.
-- WARNING: dropping the column deletes everyone's chosen avatar (they fall back to initials).

begin;

alter table public.users drop constraint if exists users_avatar_variant_chars;
alter table public.users drop column if exists avatar_variant;

commit;
