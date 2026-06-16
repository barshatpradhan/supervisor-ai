create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.user_role as enum ('admin', 'supervisor', 'employee');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.employment_type as enum ('full_time', 'part_time');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum ('draft', 'active', 'on_hold', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'review', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text unique,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name text not null,
  bio text,
  employment_type public.employment_type not null default 'full_time',
  weekly_capacity_hours numeric(6, 2) not null default 40 check (weekly_capacity_hours > 0),
  workload_percentage integer not null default 0 check (workload_percentage between 0 and 100),
  availability_percentage integer not null default 100 check (availability_percentage between 0 and 100),
  performance_score numeric(5, 2) check (performance_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name text not null,
  department text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.project_status not null default 'draft',
  priority public.priority_level not null default 'medium',
  required_skills text[] not null default '{}',
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.priority_level not null default 'medium',
  estimated_hours numeric(6, 2) not null default 1 check (estimated_hours > 0),
  assigned_employee_id uuid references public.employees(id) on delete set null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.task_progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  progress_percentage integer not null check (progress_percentage between 0 and 100),
  status public.task_status,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);
create index if not exists users_role_idx on public.users(role);
create index if not exists employees_user_id_idx on public.employees(user_id);
create index if not exists supervisors_user_id_idx on public.supervisors(user_id);
create index if not exists projects_created_by_user_id_idx on public.projects(created_by_user_id);
create index if not exists projects_status_idx on public.projects(status) where deleted_at is null;
create index if not exists tasks_project_id_idx on public.tasks(project_id) where deleted_at is null;
create index if not exists tasks_assigned_employee_id_idx on public.tasks(assigned_employee_id) where deleted_at is null;
create index if not exists tasks_status_idx on public.tasks(status) where deleted_at is null;
create index if not exists task_progress_task_id_idx on public.task_progress(task_id);
create index if not exists task_progress_employee_id_idx on public.task_progress(employee_id);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists set_supervisors_updated_at on public.supervisors;
create trigger set_supervisors_updated_at
before update on public.supervisors
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
