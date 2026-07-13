alter table public.employees
add column if not exists updated_at timestamptz not null default now();
