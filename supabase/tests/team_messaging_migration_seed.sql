-- Seed for supabase/tests/team_messaging_migration_test.sql. Disposable databases only.
-- Pre-existing data, as in production before the migration.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','a@x.test');
insert into public.users (id, auth_user_id, email) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','a@x.test');
insert into public.organizations (id, name, slug, created_by_user_id) values
 ('20000000-0000-0000-0000-000000000001','Org One','org-one','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Org Two','org-two','10000000-0000-0000-0000-000000000001');
insert into public.projects (id, title, organization_id, created_by_user_id) values
 ('30000000-0000-0000-0000-000000000001','P1','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002','P2','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
insert into public.projects (id, title, organization_id, created_by_user_id, deleted_at) values
 ('30000000-0000-0000-0000-000000000003','Deleted','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', now());
insert into public.activity_logs (organization_id, event_type) select '20000000-0000-0000-0000-000000000001', t from unnest(array['task_progress_updated','task_completed','project_progress_updated','employee_dashboard_viewed','supervisor_dashboard_viewed','invitation_link_copied']) t;
