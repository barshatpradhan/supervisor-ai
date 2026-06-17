alter table public.project_document_analyses
  add column if not exists preferred_skills text[] not null default '{}',
  add column if not exists suggested_roles text[] not null default '{}',
  add column if not exists risks text[] not null default '{}';

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_id uuid references public.project_document_analyses(id) on delete set null,
  recommendation_run_id uuid not null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  generated_by_user_id uuid not null references public.users(id) on delete restrict,
  rank integer not null check (rank > 0),
  match_score numeric(5, 2) not null check (match_score between 0 and 100),
  confidence_score numeric(5, 2) not null check (confidence_score between 0 and 100),
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  score_breakdown jsonb not null default '{}'::jsonb,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_recommendations_project_id_created_at_idx
  on public.ai_recommendations(project_id, created_at desc);

create index if not exists ai_recommendations_project_id_run_id_idx
  on public.ai_recommendations(project_id, recommendation_run_id);

create index if not exists ai_recommendations_employee_id_idx
  on public.ai_recommendations(employee_id);
