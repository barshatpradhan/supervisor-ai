-- Application-controlled invitations are created before an identity exists.
-- The user and membership links are filled atomically when the invitation is accepted.

alter table public.organization_invitations
  alter column user_id drop not null,
  alter column membership_id drop not null;
