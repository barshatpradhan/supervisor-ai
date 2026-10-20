-- One shared skill catalog for the whole app.
--
-- * skill_match_key() is the dedupe key: lower case, "+" -> "plus", "#" -> "sharp", then only
--   letters and digits. "Node.js", "node js" and "NodeJS" share a key; C, C# and C++ do not.
--   backend/src/utils/skillNames.ts implements the same function and must stay in sync.
-- * skill_aliases maps other spellings ("reactjs", "k8s", "postgres") to a catalog skill.
-- * A pre-approved catalog with categories is seeded. Existing per-organization skills are
--   merged into it (or into each other) and become global, so there are no duplicates.
-- Re-runnable: every step is guarded or idempotent.

create or replace function public.skill_match_key(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    replace(replace(lower(coalesce(value, '')), '+', 'plus'), '#', 'sharp'),
    '[^a-z0-9]', '', 'g'
  );
$$;

create table if not exists public.skill_aliases (
  alias_key text primary key check (alias_key <> '' and alias_key = public.skill_match_key(alias_key)),
  skill_id uuid not null references public.skills(id) on delete cascade,
  source text not null default 'catalog' check (source in ('catalog', 'ai', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists skill_aliases_skill_idx on public.skill_aliases (skill_id);

alter table public.skill_aliases enable row level security;

drop policy if exists skill_aliases_select_authenticated on public.skill_aliases;
create policy skill_aliases_select_authenticated
  on public.skill_aliases
  for select
  to authenticated
  using (true);

-- ---------- Catalog ----------

create temporary table _skill_catalog (
  name text not null,
  category text not null,
  aliases text[] not null default '{}'
) on commit drop;

insert into _skill_catalog (name, category, aliases) values
  -- Programming languages
  ('JavaScript', 'Programming languages', array['js', 'es6', 'ecmascript']),
  ('TypeScript', 'Programming languages', array['ts']),
  ('Python', 'Programming languages', array['py', 'python3']),
  ('Java', 'Programming languages', array['java se', 'core java']),
  ('C#', 'Programming languages', array['c sharp', 'csharp']),
  ('C++', 'Programming languages', array['cpp']),
  ('C', 'Programming languages', array['c language', 'c programming']),
  ('Go', 'Programming languages', array['golang']),
  ('Rust', 'Programming languages', array['rust lang']),
  ('Ruby', 'Programming languages', array[]::text[]),
  ('PHP', 'Programming languages', array[]::text[]),
  ('Kotlin', 'Programming languages', array[]::text[]),
  ('Swift', 'Programming languages', array[]::text[]),
  ('Scala', 'Programming languages', array[]::text[]),
  ('R', 'Programming languages', array['r language', 'r programming']),
  ('Dart', 'Programming languages', array[]::text[]),
  ('Bash', 'Programming languages', array['shell scripting', 'shell', 'bash scripting']),
  -- Frontend
  ('React', 'Frontend', array['reactjs', 'react.js', 'react js']),
  ('Next.js', 'Frontend', array['next']),
  ('Vue.js', 'Frontend', array['vue', 'vue 3']),
  ('Angular', 'Frontend', array['angularjs', 'angular.js']),
  ('Svelte', 'Frontend', array['sveltekit']),
  ('HTML', 'Frontend', array['html5']),
  ('CSS', 'Frontend', array['css3']),
  ('Tailwind CSS', 'Frontend', array['tailwind', 'tailwindcss']),
  ('Sass', 'Frontend', array['scss']),
  ('Redux', 'Frontend', array['redux toolkit']),
  ('Vite', 'Frontend', array[]::text[]),
  ('Webpack', 'Frontend', array[]::text[]),
  ('Web accessibility', 'Frontend', array['accessibility', 'a11y', 'wcag']),
  ('Responsive design', 'Frontend', array['responsive web design']),
  ('Design systems', 'Frontend', array['design system', 'component libraries']),
  -- Backend
  ('Node.js', 'Backend', array['node', 'nodejs']),
  ('Express', 'Backend', array['express.js', 'expressjs']),
  ('NestJS', 'Backend', array['nest.js', 'nest']),
  ('Django', 'Backend', array[]::text[]),
  ('Flask', 'Backend', array[]::text[]),
  ('FastAPI', 'Backend', array[]::text[]),
  ('Spring Boot', 'Backend', array['spring', 'spring framework']),
  ('Ruby on Rails', 'Backend', array['rails', 'ror']),
  ('.NET', 'Backend', array['dotnet', 'asp.net', 'asp.net core', '.net core']),
  ('REST APIs', 'Backend', array['rest', 'rest api', 'restful apis', 'restful api']),
  ('GraphQL', 'Backend', array['gql']),
  ('gRPC', 'Backend', array[]::text[]),
  ('Microservices', 'Backend', array['microservice architecture']),
  ('WebSockets', 'Backend', array['websocket']),
  ('Apache Kafka', 'Backend', array['kafka']),
  ('RabbitMQ', 'Backend', array[]::text[]),
  -- Mobile
  ('React Native', 'Mobile', array['rn']),
  ('Flutter', 'Mobile', array[]::text[]),
  ('iOS development', 'Mobile', array['ios', 'ios dev']),
  ('Android development', 'Mobile', array['android', 'android dev']),
  ('SwiftUI', 'Mobile', array[]::text[]),
  -- Databases
  ('SQL', 'Databases', array[]::text[]),
  ('PostgreSQL', 'Databases', array['postgres', 'psql', 'postgre']),
  ('MySQL', 'Databases', array[]::text[]),
  ('SQLite', 'Databases', array[]::text[]),
  ('MongoDB', 'Databases', array['mongo']),
  ('Redis', 'Databases', array[]::text[]),
  ('Supabase', 'Databases', array[]::text[]),
  ('Firebase', 'Databases', array['firestore']),
  ('Elasticsearch', 'Databases', array['elastic search']),
  ('DynamoDB', 'Databases', array['dynamo']),
  ('Row-level security', 'Databases', array['rls', 'row level security policies']),
  ('Database design', 'Databases', array['data modeling', 'data modelling', 'schema design']),
  ('Prisma', 'Databases', array[]::text[]),
  -- Cloud & DevOps
  ('AWS', 'Cloud & DevOps', array['amazon web services']),
  ('Microsoft Azure', 'Cloud & DevOps', array['azure']),
  ('Google Cloud', 'Cloud & DevOps', array['gcp', 'google cloud platform']),
  ('Docker', 'Cloud & DevOps', array['containers', 'containerization']),
  ('Kubernetes', 'Cloud & DevOps', array['k8s']),
  ('Terraform', 'Cloud & DevOps', array['infrastructure as code', 'iac']),
  ('CI/CD', 'Cloud & DevOps', array['cicd', 'continuous integration', 'continuous delivery', 'continuous deployment']),
  ('GitHub Actions', 'Cloud & DevOps', array['gh actions']),
  ('Git', 'Cloud & DevOps', array['version control', 'github', 'gitlab']),
  ('Linux', 'Cloud & DevOps', array['unix']),
  ('Nginx', 'Cloud & DevOps', array[]::text[]),
  ('Serverless', 'Cloud & DevOps', array['aws lambda', 'lambda']),
  ('Observability', 'Cloud & DevOps', array['monitoring', 'logging and monitoring']),
  -- Data & analytics
  ('Data analysis', 'Data & analytics', array['data analytics']),
  ('Data visualization', 'Data & analytics', array['data visualisation', 'dataviz']),
  ('Pandas', 'Data & analytics', array[]::text[]),
  ('NumPy', 'Data & analytics', array[]::text[]),
  ('Apache Spark', 'Data & analytics', array['spark', 'pyspark']),
  ('Apache Airflow', 'Data & analytics', array['airflow']),
  ('ETL', 'Data & analytics', array['data pipelines', 'elt']),
  ('dbt', 'Data & analytics', array['data build tool']),
  ('Power BI', 'Data & analytics', array['powerbi']),
  ('Tableau', 'Data & analytics', array[]::text[]),
  ('Excel', 'Data & analytics', array['microsoft excel', 'spreadsheets']),
  ('Statistics', 'Data & analytics', array['statistical analysis']),
  -- AI & machine learning
  ('Machine learning', 'AI & machine learning', array['ml']),
  ('Deep learning', 'AI & machine learning', array['dl', 'neural networks']),
  ('PyTorch', 'AI & machine learning', array['torch']),
  ('TensorFlow', 'AI & machine learning', array['tf', 'keras']),
  ('scikit-learn', 'AI & machine learning', array['sklearn', 'scikit learn']),
  ('Natural language processing', 'AI & machine learning', array['nlp']),
  ('Computer vision', 'AI & machine learning', array['image recognition']),
  ('Large language models', 'AI & machine learning', array['llm', 'llms']),
  ('Prompt engineering', 'AI & machine learning', array[]::text[]),
  ('Generative AI', 'AI & machine learning', array['genai', 'gen ai']),
  -- Testing & QA
  ('Unit testing', 'Testing & QA', array['unit tests']),
  ('Integration testing', 'Testing & QA', array['integration tests']),
  ('End-to-end testing', 'Testing & QA', array['e2e', 'e2e testing', 'end to end tests']),
  ('Test automation', 'Testing & QA', array['automated testing', 'automation testing']),
  ('Manual testing', 'Testing & QA', array['manual qa']),
  ('Performance testing', 'Testing & QA', array['load testing', 'stress testing']),
  ('Accessibility testing', 'Testing & QA', array['a11y testing']),
  ('Playwright', 'Testing & QA', array[]::text[]),
  ('Cypress', 'Testing & QA', array[]::text[]),
  ('Jest', 'Testing & QA', array[]::text[]),
  ('Vitest', 'Testing & QA', array[]::text[]),
  ('Selenium', 'Testing & QA', array['selenium webdriver']),
  -- Security
  ('Application security', 'Security', array['appsec', 'web security']),
  ('OAuth', 'Security', array['oauth2', 'oauth 2.0', 'openid connect', 'oidc']),
  ('Authentication', 'Security', array['auth', 'authn']),
  ('Penetration testing', 'Security', array['pentesting', 'pen testing', 'ethical hacking']),
  ('OWASP', 'Security', array['owasp top 10']),
  ('Identity and access management', 'Security', array['iam']),
  -- Design & UX
  ('Figma', 'Design & UX', array[]::text[]),
  ('UX research', 'Design & UX', array['user research']),
  ('UI design', 'Design & UX', array['user interface design', 'visual design']),
  ('UX design', 'Design & UX', array['user experience design', 'ux']),
  ('Prototyping', 'Design & UX', array[]::text[]),
  ('Wireframing', 'Design & UX', array['wireframes']),
  ('Usability testing', 'Design & UX', array[]::text[]),
  -- Product & delivery
  ('Agile', 'Product & delivery', array['agile methodologies']),
  ('Scrum', 'Product & delivery', array['scrum master']),
  ('Kanban', 'Product & delivery', array[]::text[]),
  ('Product management', 'Product & delivery', array['pm', 'product owner']),
  ('Project management', 'Product & delivery', array['project planning']),
  ('Jira', 'Product & delivery', array[]::text[]),
  ('Technical writing', 'Product & delivery', array['documentation']),
  ('Requirements analysis', 'Product & delivery', array['business analysis', 'requirements gathering']),
  -- Collaboration
  ('Communication', 'Collaboration', array['communication skills']),
  ('Leadership', 'Collaboration', array['team leadership']),
  ('Mentoring', 'Collaboration', array['coaching']),
  ('Stakeholder management', 'Collaboration', array[]::text[]),
  ('Code review', 'Collaboration', array['code reviews', 'peer review']);

-- Remap table: old skill id -> the skill that replaces it.
create temporary table _skill_remap (old_id uuid primary key, new_id uuid not null) on commit drop;

-- 1. Existing global skills whose key matches a catalog entry become that catalog entry.
update public.skills s
set name = c.name,
    category = c.category,
    is_approved = true,
    normalized_name = public.skill_match_key(c.name)
from _skill_catalog c
where s.organization_id is null
  and public.skill_match_key(s.name) = public.skill_match_key(c.name);

-- 2. Insert the catalog entries that do not exist yet.
insert into public.skills (name, normalized_name, organization_id, is_approved, category)
select c.name, public.skill_match_key(c.name), null, true, c.category
from _skill_catalog c
where not exists (
  select 1 from public.skills s
  where s.organization_id is null
    and s.normalized_name = public.skill_match_key(c.name)
);

-- 3. Catalog aliases.
insert into public.skill_aliases (alias_key, skill_id, source)
select distinct on (public.skill_match_key(alias)) public.skill_match_key(alias), s.id, 'catalog'
from _skill_catalog c
cross join lateral unnest(c.aliases) as alias
join public.skills s on s.organization_id is null and s.normalized_name = public.skill_match_key(c.name)
where public.skill_match_key(alias) <> ''
  and public.skill_match_key(alias) <> public.skill_match_key(c.name)
on conflict (alias_key) do nothing;

-- 4. Organization skills that match a catalog skill by key or alias merge into it.
insert into _skill_remap (old_id, new_id)
select s.id, coalesce(direct.id, aliased.skill_id)
from public.skills s
left join public.skills direct
  on direct.organization_id is null and direct.normalized_name = public.skill_match_key(s.name)
left join public.skill_aliases aliased
  on aliased.alias_key = public.skill_match_key(s.name)
where s.organization_id is not null
  and coalesce(direct.id, aliased.skill_id) is not null
on conflict (old_id) do nothing;

-- 5. Remaining organization skills: one keeper per key (approved first, then oldest).
insert into _skill_remap (old_id, new_id)
select ranked.id, ranked.keeper_id
from (
  select s.id,
         first_value(s.id) over (
           partition by public.skill_match_key(s.name)
           order by s.is_approved desc, s.created_at asc, s.id
         ) as keeper_id
  from public.skills s
  where s.organization_id is not null
    and not exists (select 1 from _skill_remap r where r.old_id = s.id)
) ranked
where ranked.id <> ranked.keeper_id
on conflict (old_id) do nothing;

-- 6. Repoint employee skills. Drop rows that would duplicate an employee's existing link,
--    keeping the highest proficiency.
with mapped as (
  select es.id,
         row_number() over (
           partition by es.employee_id, coalesce(r.new_id, es.skill_id)
           order by es.proficiency_level desc, es.created_at asc, es.id
         ) as rank_in_target
  from public.employee_skills es
  left join _skill_remap r on r.old_id = es.skill_id
)
delete from public.employee_skills es
using mapped m
where es.id = m.id and m.rank_in_target > 1;

update public.employee_skills es
set skill_id = r.new_id
from _skill_remap r
where es.skill_id = r.old_id;

-- Keep the merged spelling as an alias so it resolves next time.
insert into public.skill_aliases (alias_key, skill_id, source)
select distinct on (public.skill_match_key(s.name)) public.skill_match_key(s.name), r.new_id, 'admin'
from _skill_remap r
join public.skills s on s.id = r.old_id
join public.skills target on target.id = r.new_id
where public.skill_match_key(s.name) <> ''
  and public.skill_match_key(s.name) <> public.skill_match_key(target.name)
on conflict (alias_key) do nothing;

delete from public.skills s using _skill_remap r where s.id = r.old_id;

-- 7. Surviving organization skills become global. Their key cannot clash with a global skill:
--    every clash was remapped in step 4.
update public.skills
set organization_id = null,
    normalized_name = public.skill_match_key(name)
where organization_id is not null;

-- 8. Every key is the match key from now on.
update public.skills
set normalized_name = public.skill_match_key(name)
where normalized_name is distinct from public.skill_match_key(name);

-- New skills are always global; organization_id stays only for old rows and reads.
alter table public.skills drop constraint if exists skills_global_only;
alter table public.skills add constraint skills_global_only check (organization_id is null) not valid;

-- Everyone signed in can read the catalog, including pending skills they are linked to.
drop policy if exists skills_select_member on public.skills;
create policy skills_select_member
  on public.skills
  for select
  to authenticated
  using (true);
