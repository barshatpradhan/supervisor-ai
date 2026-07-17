alter table public.users
  add column if not exists platform_role text;

update public.users
set platform_role = 'platform_admin'
where role = 'admin'
  and coalesce(platform_role, '') <> 'platform_admin';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_platform_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_platform_role_check
      check (
        platform_role is null
        or platform_role in ('platform_admin')
      );
  end if;
end
$$;
