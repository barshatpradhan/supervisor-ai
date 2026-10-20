-- Teams (read-only in the app for now) and a metadata field for marking seeded/demo data.

alter table public.organizations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.users add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text,
  lead_supervisor_id uuid references public.supervisors(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teams_org_name_key on public.teams (organization_id, lower(name));
create index if not exists teams_organization_idx on public.teams (organization_id);

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, employee_id)
);

create index if not exists team_members_employee_idx on public.team_members (employee_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member
  on public.teams
  for select
  to authenticated
  using (public.is_active_organization_member(organization_id));

drop policy if exists team_members_select_member on public.team_members;
create policy team_members_select_member
  on public.team_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and public.is_active_organization_member(t.organization_id)
    )
  );
