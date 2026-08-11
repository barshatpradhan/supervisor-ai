-- Professional context used by the employee directory and profile. These are
-- intentionally nullable so existing employees and pending invitations remain valid.
alter table public.employees
  add column if not exists job_title text,
  add column if not exists department text;

create index if not exists employees_organization_department_idx
  on public.employees(organization_id, department)
  where department is not null;
