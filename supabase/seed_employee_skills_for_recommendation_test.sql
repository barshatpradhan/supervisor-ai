-- Seed realistic employee skill links for recommendation testing.
-- Safe to run more than once because employee_skills has a unique
-- constraint on (employee_id, skill_id).

insert into public.employee_skills (
  id,
  employee_id,
  skill_id,
  proficiency_level,
  years_of_experience
) values
  -- Sona Rajput: data engineering
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', '402a050d-04cd-401c-8c47-34bac5992891', 5, 5.0), -- Python
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', '46b6c7a9-7d9e-4fc2-8b3f-de3a12ebb01e', 5, 5.0), -- SQL
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', '00c0d5b4-eeaa-4291-86b6-e258b16593ba', 4, 4.0), -- PostgreSQL
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', '94539b57-f972-453e-b052-0074faf0cb8d', 4, 3.0), -- Airflow
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', '50b8a29a-364a-4f9e-8d2c-63e3125a75f0', 4, 3.0), -- Apache Spark
  (gen_random_uuid(), '2517fb69-555d-4747-9708-10b452409412', 'e6f06f2f-6d0c-4104-9c02-1a53be363f7b', 4, 4.0), -- Analytics

  -- Kelson Patel: UX/UI design
  (gen_random_uuid(), '77fab4b6-d562-4db6-98d2-277f63d99133', '4a28b45d-608a-40e3-8440-fa558e067b32', 5, 5.0), -- UI/UX Design
  (gen_random_uuid(), '77fab4b6-d562-4db6-98d2-277f63d99133', 'e42e7e99-636c-46bb-a898-69f24c5b6068', 5, 4.0), -- Figma
  (gen_random_uuid(), '77fab4b6-d562-4db6-98d2-277f63d99133', '14b5a067-8ff6-49d5-8e29-a2ee7d1e4a98', 4, 3.0), -- Accessibility (a11y)
  (gen_random_uuid(), '77fab4b6-d562-4db6-98d2-277f63d99133', 'ec26584c-23ec-4a4e-ada4-56ec18e69e84', 4, 4.0), -- Responsive Design

  -- Test User: backend/API test profile
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', '4a6d9bf4-e13a-47f0-839a-1256adfde320', 4, 3.0), -- Node.js
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', 'ac885e14-b7cc-4222-b0d3-3420bad0f544', 4, 3.0), -- Express.js
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', '62a1d2fd-1cd0-4e3a-8db4-9ed4741562eb', 4, 3.0), -- API Design
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', '8cf13821-78c7-4cc5-a058-c8910d2cb191', 4, 3.0), -- TypeScript
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', '9ecb9f51-fa42-4ca7-8ac3-12e13608d7ec', 4, 2.0), -- Supabase
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', 'b6153c66-9a8a-4c87-9a77-d4c8bcb039be', 3, 2.0), -- Database Design
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', 'c0b9c09a-57a2-4f23-a74f-aa4ab3e81129', 4, 2.0), -- File Uploads
  (gen_random_uuid(), 'b9c1d2f1-8207-4150-b247-30de808fac35', '8e5e69e5-d041-43e4-aa6c-ac71dbe728d9', 4, 3.0), -- Authentication

  -- Marina Chanchal: frontend engineering
  (gen_random_uuid(), 'e9925c0a-2e94-42ac-ba8a-4b4ab1ecf803', 'de17a4d6-0f97-4e60-87eb-86d47c835810', 5, 4.0), -- React
  (gen_random_uuid(), 'e9925c0a-2e94-42ac-ba8a-4b4ab1ecf803', '8cf13821-78c7-4cc5-a058-c8910d2cb191', 5, 4.0), -- TypeScript
  (gen_random_uuid(), 'e9925c0a-2e94-42ac-ba8a-4b4ab1ecf803', '9568863b-c7be-4e6d-b272-0f02ea25a4b7', 4, 3.0), -- Next.js
  (gen_random_uuid(), 'e9925c0a-2e94-42ac-ba8a-4b4ab1ecf803', '3cf25eb5-89e5-4400-a86a-8f9885675bf5', 5, 5.0), -- CSS
  (gen_random_uuid(), 'e9925c0a-2e94-42ac-ba8a-4b4ab1ecf803', 'ec26584c-23ec-4a4e-ada4-56ec18e69e84', 4, 3.0), -- Responsive Design

  -- Bibek Dai: mobile development
  (gen_random_uuid(), 'f64477f8-efc8-441d-9c69-6bb7eec509d7', '6eb60318-0cb4-49dd-a5ad-31f68a5f1a87', 5, 4.0), -- Flutter
  (gen_random_uuid(), 'f64477f8-efc8-441d-9c69-6bb7eec509d7', '7f1eb6e3-2176-4b18-b675-b40cbf394054', 5, 4.0), -- Dart
  (gen_random_uuid(), 'f64477f8-efc8-441d-9c69-6bb7eec509d7', '9099dea1-5a26-4790-829f-26f26e0f18c2', 4, 3.0), -- React Native
  (gen_random_uuid(), 'f64477f8-efc8-441d-9c69-6bb7eec509d7', '813696d7-8084-404a-976f-9ce05edf837f', 4, 3.0), -- Android Development
  (gen_random_uuid(), 'f64477f8-efc8-441d-9c69-6bb7eec509d7', '1a4cd1b2-67ec-422e-9dda-da57c0c22ccb', 4, 3.0) -- iOS Development
on conflict (employee_id, skill_id) do update set
  proficiency_level = excluded.proficiency_level,
  years_of_experience = excluded.years_of_experience;
