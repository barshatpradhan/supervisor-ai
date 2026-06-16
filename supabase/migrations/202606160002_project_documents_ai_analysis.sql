do $$ begin
  create type public.document_extraction_status as enum ('pending', 'extracted', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_analysis_complexity as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-documents',
  'project-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.users(id) on delete restrict,
  storage_bucket text not null default 'project-documents',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  extracted_text text,
  extraction_status public.document_extraction_status not null default 'pending',
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_document_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.project_documents(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  required_skills text[] not null default '{}',
  complexity public.document_analysis_complexity not null default 'medium',
  estimated_hours numeric(8, 2) not null default 1 check (estimated_hours > 0),
  summary text not null,
  provider text not null default 'placeholder',
  model text,
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents(project_id);

create index if not exists project_documents_uploaded_by_user_id_idx
  on public.project_documents(uploaded_by_user_id);

create index if not exists project_document_analyses_project_id_idx
  on public.project_document_analyses(project_id);

drop trigger if exists set_project_documents_updated_at on public.project_documents;
create trigger set_project_documents_updated_at
before update on public.project_documents
for each row execute function public.set_updated_at();
