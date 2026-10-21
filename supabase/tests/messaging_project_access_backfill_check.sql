-- Read-only check after applying 202610240001_messaging_project_access_history.sql (safe to run on
-- production). Compares the access table with the distinct (assigned employee, project) pairs from
-- live tasks. expected_pairs must equal access_rows, and missing_rows and extra_rows must be 0.

with expected as (
  select distinct t.assigned_employee_id as employee_id, t.project_id
  from public.tasks t
  where t.assigned_employee_id is not null
    and t.deleted_at is null
)
select
  (select count(*) from expected) as expected_pairs,
  (select count(*) from public.messaging_project_access) as access_rows,
  (select count(*)
     from expected e
     left join public.messaging_project_access a using (employee_id, project_id)
    where a.employee_id is null) as missing_rows,
  (select count(*)
     from public.messaging_project_access a
     left join expected e using (employee_id, project_id)
    where e.employee_id is null) as extra_rows;
