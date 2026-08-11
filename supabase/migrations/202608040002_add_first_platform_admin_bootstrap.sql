-- The bootstrap RPC is intentionally callable only by Supabase's service_role.
-- It serializes the one-time promotion so concurrent bootstrap attempts cannot
-- create multiple first platform administrators.
create or replace function public.bootstrap_first_platform_admin(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted_user_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('supervisor-ai:first-platform-admin')::bigint);

  if exists (
    select 1
    from public.users
    where platform_role = 'platform_admin'
  ) then
    raise exception 'A platform administrator already exists.';
  end if;

  update public.users
  set platform_role = 'platform_admin'
  where id = target_user_id
    and platform_role is null
  returning id into promoted_user_id;

  if promoted_user_id is null then
    raise exception 'The target user cannot be promoted.';
  end if;

  return promoted_user_id;
end;
$$;

revoke all on function public.bootstrap_first_platform_admin(uuid) from public;
revoke all on function public.bootstrap_first_platform_admin(uuid) from anon, authenticated;
grant execute on function public.bootstrap_first_platform_admin(uuid) to service_role;
