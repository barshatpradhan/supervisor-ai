import { supabase } from "../config/supabase.js";
import type { AuthenticatedAppUser, LegacyUserRole, PlatformRole } from "../types/auth.js";
import type {
  CreateOrganizationInput,
  CreateOrganizationInvitationInput,
  CurrentUserOrganizationListItem,
  EmployeeInvitationProfileInput,
  Organization,
  OrganizationInvitation,
  OrganizationInvitationSummary,
  OrganizationMemberSummary,
  OrganizationMembership,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  SupervisorInvitationProfileInput,
} from "../types/organization.js";
import { AppError } from "../utils/appError.js";
import { isRecord } from "../utils/validation.js";
import { createEmployeeProfileRecordForOrganization } from "./employeeService.js";
import { replaceEmployeeSkillsWithDetails } from "./skillService.js";
import { createSupervisorProfileRecordForOrganization } from "./supervisorService.js";
import { getAppUserByAuthId } from "./userService.js";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  invited_by_user_id: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

interface OrganizationMembershipWithOrganizationRow extends OrganizationMembershipRow {
  organizations: OrganizationRow | null;
}

interface OrganizationInvitationRow {
  id: string;
  organization_id: string;
  user_id: string;
  membership_id: string;
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  profile: Record<string, unknown>;
  invited_by_user_id: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface OrganizationInvitationListRow extends OrganizationInvitationRow {
  organization_members: Pick<OrganizationMembershipRow, "status"> | null;
}

interface CurrentUserOrganizationInvitationRow {
  id: string;
  membership_id: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_at: string;
}

interface UserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: LegacyUserRole | null;
  platform_role: PlatformRole | null;
  created_at?: string | null;
}

interface OrganizationMemberBaseRow {
  id: string;
  user_id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  invited_at: string | null;
  joined_at: string | null;
  users: {
    id: string;
    email: string | null;
  } | null;
}

interface OrganizationEmployeeProfileRow {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
}

interface OrganizationSupervisorProfileRow {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
}

function logOrganizationEvent(
  event: string,
  details: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      scope: "organization",
      event,
      ...details,
    })
  );
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
    updated_at: row.updated_at,
  };
}

function mapMembership(row: OrganizationMembershipRow): OrganizationMembership {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    invited_by_user_id: row.invited_by_user_id,
    joined_at: row.joined_at,
    created_at: row.created_at,
  };
}

function mapInvitation(row: OrganizationInvitationRow): OrganizationInvitation {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    membership_id: row.membership_id,
    email: row.email,
    role: row.role,
    profile: row.profile,
    invited_at: row.invited_at,
    invited_by_user_id: row.invited_by_user_id,
    expires_at: row.expires_at,
    accepted_at: row.accepted_at,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
  };
}

function mapCurrentUserOrganizationListItem(input: {
  membership: OrganizationMembershipRow;
  organization: OrganizationRow;
  invitation: CurrentUserOrganizationInvitationRow | null;
}): CurrentUserOrganizationListItem {
  return {
    membership: {
      id: input.membership.id,
      role: input.membership.role,
      status: input.membership.status,
      invited_at: input.membership.invited_at,
      joined_at: input.membership.joined_at,
      created_at: input.membership.created_at,
    },
    organization: {
      id: input.organization.id,
      name: input.organization.name,
      slug: input.organization.slug,
    },
    invitation: input.invitation
      ? {
          id: input.invitation.id,
          expires_at: input.invitation.expires_at,
        }
      : null,
  };
}

function normalizeOrganizationSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function mapLegacyUserRole(
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">
): Extract<LegacyUserRole, "employee" | "supervisor"> {
  return role === "supervisor" ? "supervisor" : "employee";
}

async function ensureNoActiveOrganizationMembership(userId: string) {
  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new AppError("Unable to validate organization membership.", 500);
  }

  if ((count ?? 0) > 0) {
    throw new AppError(
      "Only users without an active organization can create their first organization.",
      409
    );
  }
}

async function getOrganizationMembershipRow(
  userId: string,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
        id,
        organization_id,
        user_id,
        role,
        status,
        invited_by_user_id,
        invited_at,
        joined_at,
        created_at,
        organizations (
          id,
          name,
          slug,
          created_by_user_id,
          created_at,
          updated_at
        )
      `
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle<OrganizationMembershipWithOrganizationRow>();

  if (error) {
    throw new AppError("Unable to resolve organization membership.", 500);
  }

  return data;
}

async function ensureOrganizationAdmin(userId: string, organizationId: string) {
  const membershipRow = await getOrganizationMembershipRow(userId, organizationId);

  if (!membershipRow || !membershipRow.organizations) {
    throw new AppError("Organization membership not found.", 403);
  }

  if (membershipRow.status !== "active") {
    throw new AppError("Only active organization members can perform this action.", 403);
  }

  if (membershipRow.role !== "organization_admin") {
    throw new AppError("Only organization admins can perform this action.", 403);
  }

  return {
    membership: mapMembership(membershipRow),
    organization: mapOrganization(membershipRow.organizations),
  };
}

async function getOrCreateAppUserForInvitation(input: {
  authUserId: string;
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const { data: existingUserByAuthId, error: existingByAuthError } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role")
    .eq("auth_user_id", input.authUserId)
    .maybeSingle<UserRow>();

  if (existingByAuthError) {
    throw new AppError("Unable to resolve invited user.", 500);
  }

  if (existingUserByAuthId) {
    if ((existingUserByAuthId.email ?? "").toLowerCase() !== normalizedEmail) {
      await supabase
        .from("users")
        .update({ email: normalizedEmail })
        .eq("id", existingUserByAuthId.id);
    }

    return existingUserByAuthId;
  }

  const { data: existingUserByEmail, error: existingByEmailError } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role")
    .eq("email", normalizedEmail)
    .maybeSingle<UserRow>();

  if (existingByEmailError) {
    throw new AppError("Unable to resolve invited user.", 500);
  }

  if (existingUserByEmail) {
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ auth_user_id: input.authUserId, email: normalizedEmail })
      .eq("id", existingUserByEmail.id)
      .select("id, auth_user_id, email, role, platform_role")
      .single<UserRow>();

    if (updateError || !updatedUser) {
      throw new AppError("Unable to update invited user.", 500);
    }

    return updatedUser;
  }

  const { data: createdUser, error: createError } = await supabase
    .from("users")
    .insert({
      auth_user_id: input.authUserId,
      email: normalizedEmail,
      role: mapLegacyUserRole(input.role),
      platform_role: null,
    })
    .select("id, auth_user_id, email, role, platform_role")
    .single<UserRow>();

  if (createError || !createdUser) {
    throw new AppError("Unable to create invited user.", 500);
  }

  return createdUser;
}

function parseEmployeeInvitationProfile(
  profile: Record<string, unknown>
): EmployeeInvitationProfileInput {
  const full_name = profile.full_name;
  const employment_type = profile.employment_type;
  const weekly_capacity_hours = profile.weekly_capacity_hours;
  const bio = profile.bio;
  const skills = profile.skills;

  if (typeof full_name !== "string" || full_name.trim().length === 0) {
    throw new AppError("Invitation profile is missing a valid employee full name.", 500);
  }

  if (
    employment_type !== undefined &&
    employment_type !== "full_time" &&
    employment_type !== "part_time"
  ) {
    throw new AppError("Invitation profile has an invalid employee type.", 500);
  }

  if (
    weekly_capacity_hours !== undefined &&
    (typeof weekly_capacity_hours !== "number" || !Number.isFinite(weekly_capacity_hours))
  ) {
    throw new AppError("Invitation profile has invalid weekly capacity hours.", 500);
  }

  return {
    full_name: full_name.trim(),
    bio: typeof bio === "string" ? bio : undefined,
    employment_type,
    weekly_capacity_hours,
    skills: Array.isArray(skills)
      ? skills.flatMap((skill) => {
          if (!isRecord(skill) || typeof skill.name !== "string") {
            return [];
          }

          const proficiency_level =
            typeof skill.proficiency_level === "number"
              ? skill.proficiency_level
              : undefined;
          const years_of_experience =
            typeof skill.years_of_experience === "number"
              ? skill.years_of_experience
              : skill.years_of_experience === null
                ? null
                : undefined;

          return [
            {
              name: skill.name,
              proficiency_level,
              years_of_experience,
            },
          ];
        })
      : [],
  };
}

function parseSupervisorInvitationProfile(
  profile: Record<string, unknown>
): SupervisorInvitationProfileInput {
  const full_name = profile.full_name;
  const department = profile.department;
  const bio = profile.bio;

  if (typeof full_name !== "string" || full_name.trim().length === 0) {
    throw new AppError(
      "Invitation profile is missing a valid supervisor full name.",
      500
    );
  }

  return {
    full_name: full_name.trim(),
    department: typeof department === "string" ? department : undefined,
    bio: typeof bio === "string" ? bio : undefined,
  };
}

export async function resolveOrganizationContextForUser(
  authUserId: string,
  organizationId: string,
  options: { allowInvited?: boolean } = {}
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const membershipRow = await getOrganizationMembershipRow(appUser.id, organizationId);

  if (!membershipRow || !membershipRow.organizations) {
    throw new AppError("Organization membership not found.", 403);
  }

  if (!options.allowInvited && membershipRow.status !== "active") {
    if (membershipRow.status === "invited") {
      throw new AppError("Invitation must be accepted before accessing organization data.", 403);
    }

    throw new AppError("Organization membership is suspended.", 403);
  }

  return {
    appUser,
    membership: mapMembership(membershipRow),
    organization: mapOrganization(membershipRow.organizations),
  };
}

export async function createOrganizationForAuthenticatedUser(
  authUserId: string,
  input: CreateOrganizationInput
) {
  const appUser = await getAppUserByAuthId(authUserId);
  const normalizedSlug = normalizeOrganizationSlug(input.slug);

  if (!normalizedSlug) {
    throw new AppError("Organization slug must contain letters or numbers.", 400);
  }

  await ensureNoActiveOrganizationMembership(appUser.id);

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name: input.name.trim(),
      slug: normalizedSlug,
      created_by_user_id: appUser.id,
    })
    .select("id, name, slug, created_by_user_id, created_at, updated_at")
    .single<OrganizationRow>();

  if (organizationError || !organization) {
    if (organizationError?.code === "23505") {
      throw new AppError("Organization slug already exists.", 409);
    }

    throw new AppError("Unable to create organization.", 400);
  }

  const now = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: appUser.id,
      role: "organization_admin",
      status: "active",
      invited_by_user_id: appUser.id,
      invited_at: now,
      joined_at: now,
    })
    .select(
      "id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at"
    )
    .single<OrganizationMembershipRow>();

  if (membershipError || !membership) {
    await supabase.from("organizations").delete().eq("id", organization.id);
    throw new AppError("Unable to create organization membership.", 400);
  }

  logOrganizationEvent("organization_created", {
    appUserId: appUser.id,
    organizationId: organization.id,
    slug: organization.slug,
  });

  return {
    membership: mapMembership(membership),
    organization: mapOrganization(organization),
  };
}

export async function listCurrentUserOrganizations(
  authUserId: string
): Promise<CurrentUserOrganizationListItem[]> {
  const appUser = await getAppUserByAuthId(authUserId);

  const { data: membershipRows, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      `
        id,
        organization_id,
        user_id,
        role,
        status,
        invited_by_user_id,
        invited_at,
        joined_at,
        created_at,
        organizations (
          id,
          name,
          slug,
          created_by_user_id,
          created_at,
          updated_at
        )
      `
    )
    .eq("user_id", appUser.id)
    .returns<OrganizationMembershipWithOrganizationRow[]>();

  if (membershipError) {
    throw new AppError("Unable to fetch organizations.", 500, true, {
      cause: membershipError,
    });
  }

  const membershipsWithOrganizations = (membershipRows ?? []).filter(
    (membership): membership is OrganizationMembershipWithOrganizationRow & {
      organizations: OrganizationRow;
    } => membership.organizations !== null
  );

  if (membershipsWithOrganizations.length === 0) {
    return [];
  }

  const membershipIds = membershipsWithOrganizations.map((membership) => membership.id);
  const { data: invitationRows, error: invitationError } = await supabase
    .from("organization_invitations")
    .select("id, membership_id, expires_at, accepted_at, revoked_at, invited_at")
    .in("membership_id", membershipIds)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("invited_at", { ascending: false })
    .returns<CurrentUserOrganizationInvitationRow[]>();

  if (invitationError) {
    throw new AppError("Unable to fetch organizations.", 500, true, {
      cause: invitationError,
    });
  }

  const latestInvitationByMembershipId = new Map<string, CurrentUserOrganizationInvitationRow>();
  for (const invitation of invitationRows ?? []) {
    if (!latestInvitationByMembershipId.has(invitation.membership_id)) {
      latestInvitationByMembershipId.set(invitation.membership_id, invitation);
    }
  }

  const statusRank: Record<OrganizationMembershipStatus, number> = {
    active: 0,
    invited: 1,
    suspended: 2,
  };

  return membershipsWithOrganizations
    .slice()
    .sort((left, right) => {
      const statusDifference = statusRank[left.status] - statusRank[right.status];
      if (statusDifference !== 0) {
        return statusDifference;
      }

      return left.organizations.name.localeCompare(right.organizations.name, undefined, {
        sensitivity: "base",
      });
    })
    .map((membership) =>
      mapCurrentUserOrganizationListItem({
        membership,
        organization: membership.organizations,
        invitation:
          membership.status === "invited"
            ? (latestInvitationByMembershipId.get(membership.id) ?? null)
            : null,
      })
    );
}

export async function getOrganizationDetails(organizationId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_by_user_id, created_at, updated_at")
    .eq("id", organizationId)
    .single<OrganizationRow>();

  if (error || !data) {
    throw new AppError("Organization not found.", 404);
  }

  return mapOrganization(data);
}

export async function listOrganizationMembers(organizationId: string) {
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select(
      `
        id,
        user_id,
        role,
        status,
        invited_at,
        joined_at,
        users!organization_members_user_id_fkey (
          id,
          email
        )
      `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .returns<OrganizationMemberBaseRow[]>();

  if (membershipsError) {
    throw new AppError("Unable to fetch organization members.", 500);
  }

  const userIds = (memberships ?? []).map((membership) => membership.user_id);

  const [employeeProfilesResult, supervisorProfilesResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, user_id, organization_id, full_name")
      .eq("organization_id", organizationId)
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .returns<OrganizationEmployeeProfileRow[]>(),
    supabase
      .from("supervisors")
      .select("id, user_id, organization_id, full_name")
      .eq("organization_id", organizationId)
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .returns<OrganizationSupervisorProfileRow[]>(),
  ]);

  if (employeeProfilesResult.error || supervisorProfilesResult.error) {
    throw new AppError("Unable to fetch organization members.", 500);
  }

  const employeeProfilesByUserId = new Map(
    (employeeProfilesResult.data ?? []).map((profile) => [profile.user_id, profile])
  );
  const supervisorProfilesByUserId = new Map(
    (supervisorProfilesResult.data ?? []).map((profile) => [profile.user_id, profile])
  );

  return (memberships ?? []).map<OrganizationMemberSummary>((membership) => {
    const employeeProfile = employeeProfilesByUserId.get(membership.user_id);
    const supervisorProfile = supervisorProfilesByUserId.get(membership.user_id);

    return {
      membership_id: membership.id,
      user_id: membership.user_id,
      email: membership.users?.email ?? null,
      role: membership.role,
      status: membership.status,
      invited_at: membership.invited_at,
      joined_at: membership.joined_at,
      employee_profile_id: employeeProfile?.id ?? null,
      employee_full_name: employeeProfile?.full_name ?? null,
      supervisor_profile_id: supervisorProfile?.id ?? null,
      supervisor_full_name: supervisorProfile?.full_name ?? null,
    };
  });
}

export async function listOrganizationInvitations(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      `
        id,
        organization_id,
        user_id,
        membership_id,
        email,
        role,
        profile,
        invited_by_user_id,
        invited_at,
        expires_at,
        accepted_at,
        revoked_at,
        created_at,
        organization_members (
          status
        )
      `
    )
    .eq("organization_id", organizationId)
    .order("invited_at", { ascending: false })
    .returns<OrganizationInvitationListRow[]>();

  if (error) {
    throw new AppError("Unable to fetch organization invitations.", 500);
  }

  return (data ?? []).map<OrganizationInvitationSummary>((invitation) => ({
    invitation_id: invitation.id,
    membership_id: invitation.membership_id,
    email: invitation.email,
    role: invitation.role,
    invited_at: invitation.invited_at,
    expires_at: invitation.expires_at,
    accepted_at: invitation.accepted_at,
    revoked_at: invitation.revoked_at,
    membership_status: invitation.organization_members?.status ?? "invited",
  }));
}

export async function createOrganizationInvitation(
  authUserId: string,
  organizationId: string,
  input: CreateOrganizationInvitationInput
) {
  const inviter = await getAppUserByAuthId(authUserId);
  await ensureOrganizationAdmin(inviter.id, organizationId);

  const normalizedEmail = normalizeEmail(input.email);

  const { data: invitedAuthUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail
  );

  if (inviteError || !invitedAuthUser.user) {
    throw new AppError("Unable to create organization invitation.", 400);
  }

  const invitedAppUser = await getOrCreateAppUserForInvitation({
    authUserId: invitedAuthUser.user.id,
    email: normalizedEmail,
    role: input.role,
  });

  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from("organization_members")
    .select(
      "id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("user_id", invitedAppUser.id)
    .maybeSingle<OrganizationMembershipRow>();

  if (existingMembershipError) {
    throw new AppError("Unable to validate organization invitation.", 500);
  }

  if (existingMembership?.status === "active") {
    throw new AppError("This user is already an active member of the organization.", 409);
  }

  if (existingMembership?.status === "invited") {
    throw new AppError("This user already has a pending invitation for the organization.", 409);
  }

  if (existingMembership?.status === "suspended") {
    throw new AppError("This user has a suspended organization membership.", 409);
  }

  const invitedAt = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: invitedAppUser.id,
      role: input.role,
      status: "invited",
      invited_by_user_id: inviter.id,
      invited_at: invitedAt,
    })
    .select(
      "id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at"
    )
    .single<OrganizationMembershipRow>();

  if (membershipError || !membership) {
    if (membershipError?.code === "23505") {
      throw new AppError("This organization invitation already exists.", 409);
    }

    throw new AppError("Unable to create organization membership.", 400);
  }

  const profile =
    input.role === "employee"
      ? (() => {
          const employeeProfile = input.profile as EmployeeInvitationProfileInput;

          return {
            full_name: employeeProfile.full_name,
            bio: employeeProfile.bio ?? null,
            employment_type: employeeProfile.employment_type ?? "full_time",
            weekly_capacity_hours: employeeProfile.weekly_capacity_hours ?? 40,
            skills: Array.isArray(employeeProfile.skills) ? employeeProfile.skills : [],
          };
        })()
      : (() => {
          const supervisorProfile = input.profile as SupervisorInvitationProfileInput;

          return {
            full_name: supervisorProfile.full_name,
            department: supervisorProfile.department ?? null,
            bio: supervisorProfile.bio ?? null,
          };
        })();

  const { data: invitation, error: invitationError } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: organizationId,
      user_id: invitedAppUser.id,
      membership_id: membership.id,
      email: normalizedEmail,
      role: input.role,
      profile,
      invited_by_user_id: inviter.id,
      invited_at: invitedAt,
    })
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .single<OrganizationInvitationRow>();

  if (invitationError || !invitation) {
    await supabase.from("organization_members").delete().eq("id", membership.id);

    if (invitationError?.code === "23505") {
      throw new AppError("This organization invitation already exists.", 409);
    }

    throw new AppError("Unable to create organization invitation.", 400);
  }

  logOrganizationEvent("organization_invitation_created", {
    invitedAppUserId: invitedAppUser.id,
    inviterAppUserId: inviter.id,
    membershipId: membership.id,
    organizationId,
    role: input.role,
  });

  return {
    invitation: mapInvitation(invitation),
    membership: mapMembership(membership),
  };
}

export async function acceptOrganizationInvitation(
  authUserId: string,
  organizationId: string
) {
  const context = await resolveOrganizationContextForUser(authUserId, organizationId, {
    allowInvited: true,
  });

  if (context.membership.status === "active") {
    throw new AppError("This organization invitation has already been accepted.", 409);
  }

  if (context.membership.status === "suspended") {
    throw new AppError("This organization membership is suspended.", 403);
  }

  const { data: invitationRow, error: invitationError } = await supabase
    .from("organization_invitations")
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("user_id", context.appUser.id)
    .eq("membership_id", context.membership.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle<OrganizationInvitationRow>();

  if (invitationError) {
    throw new AppError("Unable to resolve organization invitation.", 500);
  }

  if (!invitationRow) {
    throw new AppError("Organization invitation not found.", 404);
  }

  const invitation = mapInvitation(invitationRow);

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new AppError("This organization invitation has expired.", 410);
  }

  if (invitation.role === "employee") {
    const employeeProfile = parseEmployeeInvitationProfile(invitation.profile);
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", context.appUser.id)
      .maybeSingle<{ id: string }>();

    const employee =
      existingEmployee ??
      (await createEmployeeProfileRecordForOrganization({
        userId: context.appUser.id,
        full_name: employeeProfile.full_name,
        bio: employeeProfile.bio ?? null,
        employment_type: employeeProfile.employment_type,
        organization_id: organizationId,
        weekly_capacity_hours: employeeProfile.weekly_capacity_hours,
      }));

    if (employeeProfile.skills && employeeProfile.skills.length > 0) {
      await replaceEmployeeSkillsWithDetails(
        employee.id,
        context.appUser.id,
        employeeProfile.skills,
        organizationId
      );
    }
  } else {
    const supervisorProfile = parseSupervisorInvitationProfile(invitation.profile);
    const { data: existingSupervisor } = await supabase
      .from("supervisors")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", context.appUser.id)
      .maybeSingle<{ id: string }>();

    if (!existingSupervisor) {
      await createSupervisorProfileRecordForOrganization({
        userId: context.appUser.id,
        full_name: supervisorProfile.full_name,
        department: supervisorProfile.department,
        bio: supervisorProfile.bio,
        organization_id: organizationId,
      });
    }
  }

  const acceptedAt = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .update({
      status: "active",
      joined_at: acceptedAt,
    })
    .eq("id", context.membership.id)
    .eq("status", "invited")
    .select(
      "id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at"
    )
    .single<OrganizationMembershipRow>();

  if (membershipError || !membership) {
    throw new AppError("Unable to activate organization membership.", 400);
  }

  const { error: invitationUpdateError } = await supabase
    .from("organization_invitations")
    .update({ accepted_at: acceptedAt })
    .eq("id", invitation.id);

  if (invitationUpdateError) {
    throw new AppError("Unable to mark the organization invitation as accepted.", 500);
  }

  logOrganizationEvent("organization_invitation_accepted", {
    appUserId: context.appUser.id,
    invitationId: invitation.id,
    organizationId,
    role: invitation.role,
  });

  return {
    membership: mapMembership(membership),
    organization: context.organization,
  };
}
