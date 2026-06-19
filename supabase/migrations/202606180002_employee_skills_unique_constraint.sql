do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employee_skills_employee_id_skill_id_unique'
  ) then
    alter table public.employee_skills
      add constraint employee_skills_employee_id_skill_id_unique
      unique (employee_id, skill_id);
  end if;
end $$;
