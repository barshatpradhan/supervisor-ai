-- Profile pictures: each person's chosen illustrated avatar, one per person across organizations.
--
-- * Additive and safe to re-run: a nullable column and a check constraint, both added only if missing.
--   Existing rows keep NULL, which the app shows as initials.
-- * The value is a short avatar ID such as "p03-s4-c2-a1". This constraint only guards length and
--   characters; the exact format is validated by the backend and frontend (with a test that keeps
--   their two patterns identical), so the format can evolve without a migration.
-- * Rollback: supabase/rollbacks/202610250001_user_avatar_variant_down.sql.

begin;

alter table public.users
  add column if not exists avatar_variant text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_avatar_variant_chars'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_avatar_variant_chars
      check (avatar_variant is null or avatar_variant ~ '^[a-z0-9-]{1,32}$');
  end if;
end $$;

comment on column public.users.avatar_variant is
  'Chosen illustrated avatar ID (for example p03-s4-c2-a1); NULL shows initials. Format validated by the app.';

commit;
