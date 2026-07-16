-- Phase 13.1.3
-- Forward-only reconciliation migration for skills schema drift.
--
-- This migration only applies low-risk, production-safe changes that improve
-- clean replay alignment with the current live skills contract. Broader drift
-- in base tables is documented in backend/README.md and intentionally not
-- normalized here because doing so would change live production behavior.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skills'
      and column_name = 'created_at'
      and data_type = 'timestamp with time zone'
  ) then
    alter table public.skills
      alter column created_at type timestamp
      using timezone('UTC', created_at);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employee_skills'
      and column_name = 'proficiency_level'
      and data_type <> 'smallint'
  ) then
    alter table public.employee_skills
      alter column proficiency_level type smallint
      using proficiency_level::smallint;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'skills_name_key'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_name_key
      unique (name);
  end if;
end $$;

create index if not exists employee_skills_employee_id_idx
  on public.employee_skills(employee_id);
