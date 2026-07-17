alter table public.users
  alter column role drop default;

alter table public.users
  alter column role drop not null;
