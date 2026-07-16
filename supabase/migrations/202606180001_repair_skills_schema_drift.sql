-- Repair migration for historical skills schema drift.
-- This file is intentionally ordered before 202606180002 so a clean migration
-- run creates the skills tables before the older uniqueness-only migration
-- touches public.employee_skills.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  is_approved boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  category text
);

alter table public.skills
  add column if not exists name text,
  add column if not exists normalized_name text,
  add column if not exists is_approved boolean,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists category text;

alter table public.skills
  alter column name set not null,
  alter column normalized_name set not null,
  alter column is_approved set default false,
  alter column is_approved set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency_level integer not null check (proficiency_level between 1 and 5),
  years_of_experience numeric(6, 2) check (years_of_experience >= 0),
  created_at timestamptz not null default now()
);

alter table public.employee_skills
  add column if not exists employee_id uuid,
  add column if not exists skill_id uuid,
  add column if not exists proficiency_level integer,
  add column if not exists years_of_experience numeric(6, 2),
  add column if not exists created_at timestamptz;

alter table public.employee_skills
  alter column employee_id set not null,
  alter column skill_id set not null,
  alter column proficiency_level set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'skills_normalized_name_key'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_normalized_name_key
      unique (normalized_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'skills_created_by_fkey'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_created_by_fkey
      foreign key (created_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_employee_id_fkey'
      and conrelid = 'public.employee_skills'::regclass
  ) then
    alter table public.employee_skills
      add constraint employee_skills_employee_id_fkey
      foreign key (employee_id)
      references public.employees(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_skill_id_fkey'
      and conrelid = 'public.employee_skills'::regclass
  ) then
    alter table public.employee_skills
      add constraint employee_skills_skill_id_fkey
      foreign key (skill_id)
      references public.skills(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_employee_id_skill_id_key'
      and conrelid = 'public.employee_skills'::regclass
  ) then
    alter table public.employee_skills
      add constraint employee_skills_employee_id_skill_id_key
      unique (employee_id, skill_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_proficiency_level_check'
      and conrelid = 'public.employee_skills'::regclass
  ) then
    alter table public.employee_skills
      add constraint employee_skills_proficiency_level_check
      check (proficiency_level between 1 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_years_of_experience_check'
      and conrelid = 'public.employee_skills'::regclass
  ) then
    alter table public.employee_skills
      add constraint employee_skills_years_of_experience_check
      check (years_of_experience >= 0);
  end if;
end $$;

create index if not exists skills_created_by_idx
  on public.skills(created_by);

create index if not exists skills_category_idx
  on public.skills(category);

create index if not exists skills_is_approved_name_idx
  on public.skills(is_approved, name);

create index if not exists employee_skills_skill_id_idx
  on public.employee_skills(skill_id);

alter table public.skills enable row level security;
alter table public.employee_skills enable row level security;

revoke all on table public.skills from anon, authenticated;
revoke all on table public.employee_skills from anon, authenticated;
