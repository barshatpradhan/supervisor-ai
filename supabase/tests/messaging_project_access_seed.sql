-- Seed for messaging_project_access_migration_test.sql. Disposable databases only. Run after
-- team_messaging_migration_seed.sql and before 202610240001, so the backfill has real cases:
-- two tasks for one employee in one project (earliest date wins), a soft-deleted task and an
-- unassigned task (no rows), and a second employee on a second project.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@x.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@x.test');
insert into public.users (id, auth_user_id, email) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'b1@x.test'),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b2', 'b2@x.test');
insert into public.employees (id, user_id, full_name, organization_id) values
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'Seed One', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b2', 'Seed Two', '20000000-0000-0000-0000-000000000002');
insert into public.tasks (project_id, title, created_by_user_id, assigned_employee_id, assigned_at, deleted_at) values
  ('30000000-0000-0000-0000-000000000001', 'Seed early', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000b1', '2026-02-01Z', null),
  ('30000000-0000-0000-0000-000000000001', 'Seed later', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000b1', '2026-04-01Z', null),
  ('30000000-0000-0000-0000-000000000001', 'Seed deleted', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000b1', '2025-01-01Z', now()),
  ('30000000-0000-0000-0000-000000000001', 'Seed unassigned', '10000000-0000-0000-0000-000000000001', null, null, null),
  ('30000000-0000-0000-0000-000000000002', 'Seed org two', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000b2', '2026-05-01Z', null);
