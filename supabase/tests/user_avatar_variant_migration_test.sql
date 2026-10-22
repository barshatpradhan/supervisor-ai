-- Test for 202610250001_user_avatar_variant.sql. Run ONLY against a disposable copy of the database,
-- never against production. Order of operations tested:
--
--   (a user row exists before the migration)
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610250001_user_avatar_variant.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610250001_user_avatar_variant.sql   -- re-run
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/user_avatar_variant_migration_test.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/202610250001_user_avatar_variant_down.sql
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202610250001_user_avatar_variant.sql   -- re-apply
--   psql "$DISPOSABLE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/user_avatar_variant_migration_test.sql
--
-- Everything below runs in one transaction that is rolled back.

begin;

do $$
declare
  n int;
  u uuid;
  value text;
begin
  -- Shape: nullable text, one constraint, no default.
  select count(*) into n from information_schema.columns
  where table_schema = 'public' and table_name = 'users' and column_name = 'avatar_variant'
    and data_type = 'text' and is_nullable = 'YES' and column_default is null;
  if n <> 1 then raise exception 'users.avatar_variant should be a nullable text column without a default'; end if;

  select count(*) into n from pg_constraint
  where conrelid = 'public.users'::regclass and conname = 'users_avatar_variant_chars';
  if n <> 1 then raise exception 'expected exactly one users_avatar_variant_chars constraint, found %', n; end if;

  -- Rows that existed before the migration are untouched (NULL = initials).
  select count(*) into n from public.users where avatar_variant is not null;
  if n <> 0 then raise exception 'existing users should have no avatar, found %', n; end if;

  insert into public.users (auth_user_id, email) values (gen_random_uuid(), 'avatar-test@x.test') returning id into u;

  -- Accepted: a real ID, NULL, and anything else made of a-z, 0-9 and "-" up to 32 characters
  -- (the strict format is the app's job).
  foreach value in array array['p03-s4-c2-a1', 'p12-s6-c6-a0', 'future-format-2', repeat('a', 32)] loop
    update public.users set avatar_variant = value where id = u;
  end loop;
  update public.users set avatar_variant = null where id = u;

  -- Rejected by the constraint.
  foreach value in array array['', 'P03-S4-C2-A1', 'p03 s4', 'p03_s4', '<svg>', repeat('a', 33), 'p03-s4-c2-a1;drop'] loop
    begin
      update public.users set avatar_variant = value where id = u;
      raise exception 'constraint accepted %', quote_literal(value);
    exception when check_violation then null;
    end;
  end loop;

  raise notice 'user_avatar_variant: all assertions passed';
end $$;

rollback;
