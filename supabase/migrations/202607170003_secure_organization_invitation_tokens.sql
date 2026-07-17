-- Phase 3
-- Secure invitation token lifecycle for organization onboarding.

alter table public.organization_invitations
  add column if not exists token_hash text,
  add column if not exists accepted_by_user_id uuid,
  add column if not exists revoked_by_user_id uuid,
  add column if not exists last_sent_at timestamptz,
  add column if not exists send_count integer;

alter table public.organization_invitations
  alter column send_count set default 0;

update public.organization_invitations
set send_count = 1
where send_count is null
  and invited_at is not null;

update public.organization_invitations
set send_count = 0
where send_count is null;

update public.organization_invitations
set last_sent_at = invited_at
where last_sent_at is null;

alter table public.organization_invitations
  alter column send_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_invitations_accepted_by_user_id_fkey'
      and conrelid = 'public.organization_invitations'::regclass
  ) then
    alter table public.organization_invitations
      add constraint organization_invitations_accepted_by_user_id_fkey
      foreign key (accepted_by_user_id)
      references public.users(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_invitations_revoked_by_user_id_fkey'
      and conrelid = 'public.organization_invitations'::regclass
  ) then
    alter table public.organization_invitations
      add constraint organization_invitations_revoked_by_user_id_fkey
      foreign key (revoked_by_user_id)
      references public.users(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists organization_invitations_token_hash_unique
  on public.organization_invitations(token_hash)
  where token_hash is not null;

create index if not exists organization_invitations_open_lookup_idx
  on public.organization_invitations(organization_id, membership_id, expires_at)
  where accepted_at is null and revoked_at is null;

create index if not exists organization_invitations_email_lookup_idx
  on public.organization_invitations(organization_id, lower(email), expires_at desc);
