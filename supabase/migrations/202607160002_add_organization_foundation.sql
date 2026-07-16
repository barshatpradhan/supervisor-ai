-- Phase 14
-- Multi-tenant organization foundation and first vertical-slice backfill.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_key unique (slug)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('organization_admin', 'supervisor', 'employee')),
  status text not null check (status in ('invited', 'active', 'suspended')),
  invited_by_user_id uuid references public.users(id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_members_organization_id_user_id_key unique (organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  membership_id uuid not null references public.organization_members(id) on delete cascade,
  email text not null,
  role text not null check (role in ('organization_admin', 'supervisor', 'employee')),
  profile jsonb not null default '{}'::jsonb,
  invited_by_user_id uuid not null references public.users(id) on delete restrict,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists created_by_user_id uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.organization_members
  add column if not exists organization_id uuid,
  add column if not exists user_id uuid,
  add column if not exists role text,
  add column if not exists status text,
  add column if not exists invited_by_user_id uuid,
  add column if not exists invited_at timestamptz,
  add column if not exists joined_at timestamptz,
  add column if not exists created_at timestamptz;

alter table public.organization_invitations
  add column if not exists organization_id uuid,
  add column if not exists user_id uuid,
  add column if not exists membership_id uuid,
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists profile jsonb,
  add column if not exists invited_by_user_id uuid,
  add column if not exists invited_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists created_at timestamptz;

alter table public.organizations
  alter column name set not null,
  alter column slug set not null,
  alter column created_by_user_id set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.organization_members
  alter column organization_id set not null,
  alter column user_id set not null,
  alter column role set not null,
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.organization_invitations
  alter column organization_id set not null,
  alter column user_id set not null,
  alter column membership_id set not null,
  alter column email set not null,
  alter column role set not null,
  alter column profile set default '{}'::jsonb,
  alter column profile set not null,
  alter column invited_by_user_id set not null,
  alter column invited_at set default now(),
  alter column invited_at set not null,
  alter column expires_at set default (now() + interval '30 days'),
  alter column expires_at set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_organization_id_user_id_key'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_user_id_key
      unique (organization_id, user_id);
  end if;
end $$;

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);

create index if not exists organization_members_org_role_status_idx
  on public.organization_members(organization_id, role, status);

create unique index if not exists organization_invitations_open_email_idx
  on public.organization_invitations(organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

create unique index if not exists organization_invitations_open_membership_idx
  on public.organization_invitations(membership_id)
  where accepted_at is null and revoked_at is null;

create index if not exists organization_invitations_user_id_idx
  on public.organization_invitations(user_id);

create index if not exists organizations_created_by_user_id_idx
  on public.organizations(created_by_user_id);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

alter table public.employees
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.supervisors
  add column if not exists updated_at timestamptz not null default now();

alter table public.supervisors
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.projects
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.skills
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists employees_organization_id_idx
  on public.employees(organization_id);

create index if not exists supervisors_organization_id_idx
  on public.supervisors(organization_id);

create index if not exists projects_organization_id_idx
  on public.projects(organization_id)
  where deleted_at is null;

create index if not exists skills_organization_id_idx
  on public.skills(organization_id);

do $$
declare
  default_organization_id uuid;
  default_created_by_user_id uuid;
begin
  select id
  into default_created_by_user_id
  from public.users
  order by created_at asc nulls last, id asc
  limit 1;

  if default_created_by_user_id is null then
    return;
  end if;

  insert into public.organizations (
    name,
    slug,
    created_by_user_id
  )
  values (
    'Default Organization',
    'default-organization',
    default_created_by_user_id
  )
  on conflict (slug) do nothing;

  select id
  into default_organization_id
  from public.organizations
  where slug = 'default-organization';

  if default_organization_id is null then
    return;
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    invited_at,
    joined_at
  )
  select
    default_organization_id,
    users.id,
    case users.role::text
      when 'admin' then 'organization_admin'
      when 'supervisor' then 'supervisor'
      else 'employee'
    end,
    'active',
    default_created_by_user_id,
    coalesce(users.created_at, now()),
    coalesce(users.created_at, now())
  from public.users
  on conflict (organization_id, user_id) do nothing;

  update public.employees
  set organization_id = default_organization_id
  where organization_id is null;

  update public.supervisors
  set organization_id = default_organization_id
  where organization_id is null;

  update public.projects
  set organization_id = default_organization_id
  where organization_id is null;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'employees_user_id_key'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      drop constraint employees_user_id_key;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'supervisors_user_id_key'
      and conrelid = 'public.supervisors'::regclass
  ) then
    alter table public.supervisors
      drop constraint supervisors_user_id_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_organization_id_user_id_key'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_organization_id_user_id_key
      unique (organization_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supervisors_organization_id_user_id_key'
      and conrelid = 'public.supervisors'::regclass
  ) then
    alter table public.supervisors
      add constraint supervisors_organization_id_user_id_key
      unique (organization_id, user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'skills_normalized_name_key'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      drop constraint skills_normalized_name_key;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'skills_name_key'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      drop constraint skills_name_key;
  end if;
end $$;

create unique index if not exists skills_global_normalized_name_unique
  on public.skills(normalized_name)
  where organization_id is null;

create unique index if not exists skills_global_name_unique
  on public.skills(name)
  where organization_id is null;

create unique index if not exists skills_org_normalized_name_unique
  on public.skills(organization_id, normalized_name)
  where organization_id is not null;

create index if not exists skills_org_is_approved_name_idx
  on public.skills(organization_id, is_approved, name);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_organization_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_organization_id_fkey'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supervisors_organization_id_fkey'
      and conrelid = 'public.supervisors'::regclass
  ) then
    alter table public.supervisors
      add constraint supervisors_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'skills_organization_id_fkey'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.employees where organization_id is null) then
    alter table public.employees
      alter column organization_id set not null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.supervisors where organization_id is null) then
    alter table public.supervisors
      alter column organization_id set not null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.projects where organization_id is null) then
    alter table public.projects
      alter column organization_id set not null;
  end if;
end $$;

create or replace function public.is_active_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members membership
    join public.users app_user
      on app_user.id = membership.user_id
    where membership.organization_id = target_organization_id
      and membership.status = 'active'
      and app_user.auth_user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.employees enable row level security;
alter table public.supervisors enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (public.is_active_organization_member(id));

drop policy if exists organization_members_select_member on public.organization_members;
create policy organization_members_select_member
  on public.organization_members
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists organization_invitations_select_member on public.organization_invitations;
create policy organization_invitations_select_member
  on public.organization_invitations
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists employees_select_member on public.employees;
create policy employees_select_member
  on public.employees
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists supervisors_select_member on public.supervisors;
create policy supervisors_select_member
  on public.supervisors
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists projects_select_member on public.projects;
create policy projects_select_member
  on public.projects
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists skills_select_member on public.skills;
create policy skills_select_member
  on public.skills
  for select
  to authenticated
  using (
    (organization_id is null and is_approved = true)
    or public.is_active_organization_member(organization_id)
  );
