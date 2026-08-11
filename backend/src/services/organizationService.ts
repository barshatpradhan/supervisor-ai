import crypto from "node:crypto";
import { supabase, supabaseAuth } from "../config/supabase.js";
import type { AuthSessionResponse, AuthenticatedAppUser, LegacyUserRole, PlatformRole } from "../types/auth.js";
import type {
  CreateOrganizationInput,
  CreateOrganizationInvitationInput,
  CurrentUserOrganizationListItem,
  EmployeeInvitationProfileInput,
  InvitationAcceptanceResult,
  InvitationInspectionResult,
  InvitationPublicStatus,
  Organization,
  OrganizationInvitation,
  OrganizationInvitationMutationResult,
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
import { createEmailService } from "./email/emailService.js";
import { buildOrganizationInvitationAcceptanceUrl } from "./email/invitationUrl.js";
import { getAppUserByAuthId, getAuthOnboardingStateForAppUser } from "./userService.js";

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
  user_id: string | null;
  membership_id: string | null;
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  profile: Record<string, unknown>;
  token_hash: string | null;
  invited_by_user_id: string;
  invited_at: string;
  last_sent_at: string | null;
  send_count: number;
  expires_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_by_user_id: string | null;
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

interface InvitationOrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

interface InvitationMembershipRow {
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

interface InvitationProfileProvisionResult {
  profileCreated: boolean;
  createdProfileRef:
    | {
        table: "employees" | "supervisors";
        id: string;
      }
    | null;
}

const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_TOKEN_BYTES = 32;
const INVITATION_RESEND_COOLDOWN_MS = 60 * 1000;
const INVITATION_PROFILE_META_KEY = "__invitation_meta";

interface InvitationProfileCompatibilityMetadata {
  token_hash?: string | null;
  last_sent_at?: string | null;
  send_count?: number;
  accepted_by_user_id?: string | null;
  revoked_by_user_id?: string | null;
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

function generateInvitationToken() {
  return crypto.randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
}

function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function invitationTokenHashesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function buildInvitationAcceptanceUrl(token: string) {
  return buildOrganizationInvitationAcceptanceUrl(token);
}

function buildInvitationExpiryDate(now = new Date()) {
  return new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function isInvitationExpired(expiresAt: string, now = Date.now()) {
  return new Date(expiresAt).getTime() < now;
}

function getInvitationPublicStatus(
  invitation: Pick<
    OrganizationInvitationRow,
    "accepted_at" | "revoked_at" | "expires_at"
  >
): InvitationPublicStatus {
  if (invitation.accepted_at) {
    return "accepted";
  }

  if (invitation.revoked_at) {
    return "revoked";
  }

  if (isInvitationExpired(invitation.expires_at)) {
    return "expired";
  }

  return "pending";
}

function maskInvitationEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }

  return `${localPart[0]}${"*".repeat(Math.max(localPart.length - 2, 1))}${localPart.charAt(localPart.length - 1)}@${domain}`;
}

function readInvitationCompatibilityMetadata(profile: Record<string, unknown>) {
  const rawMetadata = profile[INVITATION_PROFILE_META_KEY];

  if (!isRecord(rawMetadata)) {
    return {};
  }

  return {
    token_hash: typeof rawMetadata.token_hash === "string" ? rawMetadata.token_hash : null,
    last_sent_at:
      typeof rawMetadata.last_sent_at === "string" ? rawMetadata.last_sent_at : null,
    send_count:
      typeof rawMetadata.send_count === "number" && Number.isFinite(rawMetadata.send_count)
        ? rawMetadata.send_count
        : 0,
    accepted_by_user_id:
      typeof rawMetadata.accepted_by_user_id === "string"
        ? rawMetadata.accepted_by_user_id
        : null,
    revoked_by_user_id:
      typeof rawMetadata.revoked_by_user_id === "string"
        ? rawMetadata.revoked_by_user_id
        : null,
  } satisfies InvitationProfileCompatibilityMetadata;
}

function stripInvitationCompatibilityMetadata(profile: Record<string, unknown>) {
  const { [INVITATION_PROFILE_META_KEY]: _metadata, ...safeProfile } = profile;
  return safeProfile;
}

function writeInvitationCompatibilityMetadata(
  profile: Record<string, unknown>,
  metadata: InvitationProfileCompatibilityMetadata
) {
  return {
    ...stripInvitationCompatibilityMetadata(profile),
    [INVITATION_PROFILE_META_KEY]: {
      token_hash: metadata.token_hash ?? null,
      last_sent_at: metadata.last_sent_at ?? null,
      send_count: metadata.send_count ?? 0,
      accepted_by_user_id: metadata.accepted_by_user_id ?? null,
      revoked_by_user_id: metadata.revoked_by_user_id ?? null,
    },
  };
}

function hydrateInvitationRow(
  row: Omit<OrganizationInvitationRow, "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"> &
    Partial<
      Pick<
        OrganizationInvitationRow,
        | "token_hash"
        | "last_sent_at"
        | "send_count"
        | "accepted_by_user_id"
        | "revoked_by_user_id"
      >
    >
): OrganizationInvitationRow {
  const metadata = readInvitationCompatibilityMetadata(row.profile);

  return {
    ...row,
    profile: stripInvitationCompatibilityMetadata(row.profile),
    token_hash: row.token_hash ?? metadata.token_hash ?? null,
    last_sent_at: row.last_sent_at ?? metadata.last_sent_at ?? row.invited_at,
    send_count: row.send_count ?? metadata.send_count ?? 0,
    accepted_by_user_id: row.accepted_by_user_id ?? metadata.accepted_by_user_id ?? null,
    revoked_by_user_id: row.revoked_by_user_id ?? metadata.revoked_by_user_id ?? null,
  };
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
  const hydratedRow = hydrateInvitationRow(row);

  return {
    id: hydratedRow.id,
    organization_id: hydratedRow.organization_id,
    user_id: hydratedRow.user_id,
    membership_id: hydratedRow.membership_id,
    email: hydratedRow.email,
    role: hydratedRow.role,
    profile: hydratedRow.profile,
    last_sent_at: hydratedRow.last_sent_at,
    send_count: hydratedRow.send_count,
    invited_at: hydratedRow.invited_at,
    invited_by_user_id: hydratedRow.invited_by_user_id,
    expires_at: hydratedRow.expires_at,
    accepted_by_user_id: hydratedRow.accepted_by_user_id,
    accepted_at: hydratedRow.accepted_at,
    revoked_by_user_id: hydratedRow.revoked_by_user_id,
    revoked_at: hydratedRow.revoked_at,
    created_at: hydratedRow.created_at,
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
  const job_title = profile.job_title;
  const department = profile.department;
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
    job_title: typeof job_title === "string" ? job_title : undefined,
    department: typeof department === "string" ? department : undefined,
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

function buildStoredInvitationProfile(
  input: CreateOrganizationInvitationInput
): Record<string, unknown> {
  if (input.role === "employee") {
    const employeeProfile = input.profile as EmployeeInvitationProfileInput;

    return {
      full_name: employeeProfile.full_name,
      job_title: employeeProfile.job_title ?? null,
      department: employeeProfile.department ?? null,
      bio: employeeProfile.bio ?? null,
      employment_type: employeeProfile.employment_type ?? "full_time",
      weekly_capacity_hours: employeeProfile.weekly_capacity_hours ?? 40,
      skills: Array.isArray(employeeProfile.skills) ? employeeProfile.skills : [],
    };
  }

  const supervisorProfile = input.profile as SupervisorInvitationProfileInput;

  return {
    full_name: supervisorProfile.full_name,
    department: supervisorProfile.department ?? null,
    bio: supervisorProfile.bio ?? null,
  };
}

async function rollbackCreatedInvitationProfile(
  createdProfileRef: InvitationProfileProvisionResult["createdProfileRef"]
) {
  if (!createdProfileRef) {
    return;
  }

  const { error } = await supabase
    .from(createdProfileRef.table)
    .delete()
    .eq("id", createdProfileRef.id);

  if (error) {
    logOrganizationEvent("invitation_profile_cleanup_failed", {
      profileId: createdProfileRef.id,
      table: createdProfileRef.table,
      errorCode: error.code ?? null,
      errorMessage: error.message ?? null,
    });
  }
}

async function provisionInvitationProfile(
  invitation: OrganizationInvitationRow,
  appUserId: string,
  organizationId: string
): Promise<InvitationProfileProvisionResult> {
  if (invitation.role === "employee") {
    const employeeProfile = parseEmployeeInvitationProfile(invitation.profile);
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", appUserId)
      .maybeSingle<{ id: string }>();

    let employeeId = existingEmployee?.id ?? null;
    let createdProfileRef: InvitationProfileProvisionResult["createdProfileRef"] = null;

    if (!employeeId) {
      const createdEmployee = await createEmployeeProfileRecordForOrganization({
        userId: appUserId,
        full_name: employeeProfile.full_name,
        job_title: employeeProfile.job_title,
        department: employeeProfile.department,
        bio: employeeProfile.bio ?? null,
        employment_type: employeeProfile.employment_type,
        organization_id: organizationId,
        weekly_capacity_hours: employeeProfile.weekly_capacity_hours,
      });

      employeeId = createdEmployee.id;
      createdProfileRef = {
        table: "employees",
        id: createdEmployee.id,
      };
    }

    if (employeeProfile.skills && employeeProfile.skills.length > 0) {
      if (!employeeId) {
        throw new AppError("Employee profile provisioning did not yield an employee id.", 500);
      }

      await replaceEmployeeSkillsWithDetails(
        employeeId,
        appUserId,
        employeeProfile.skills,
        organizationId
      );
    }

    return {
      profileCreated: createdProfileRef !== null,
      createdProfileRef,
    };
  }

  const supervisorProfile = parseSupervisorInvitationProfile(invitation.profile);
  const { data: existingSupervisor } = await supabase
    .from("supervisors")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", appUserId)
    .maybeSingle<{ id: string }>();

  if (existingSupervisor) {
    return {
      profileCreated: false,
      createdProfileRef: null,
    };
  }

  const createdSupervisor = await createSupervisorProfileRecordForOrganization({
    userId: appUserId,
    full_name: supervisorProfile.full_name,
    department: supervisorProfile.department,
    bio: supervisorProfile.bio,
    organization_id: organizationId,
  });

  return {
    profileCreated: true,
    createdProfileRef: {
      table: "supervisors",
      id: createdSupervisor.id,
    },
  };
}

async function getInvitationByIdForOrganization(
  organizationId: string,
  invitationId: string
) {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .eq("organization_id", organizationId)
    .eq("id", invitationId)
    .single<
      Omit<
        OrganizationInvitationRow,
        "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"
      >
    >();

  if (error || !data) {
    throw new AppError("Organization invitation not found.", 404);
  }

  return hydrateInvitationRow(data);
}

async function getInvitationByTokenHash(tokenHash: string) {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .contains("profile", {
      [INVITATION_PROFILE_META_KEY]: {
        token_hash: tokenHash,
      },
    })
    .order("invited_at", { ascending: false })
    .limit(1)
    .maybeSingle<
      Omit<
        OrganizationInvitationRow,
        "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"
      >
    >();

  if (error) {
    throw new AppError("Unable to resolve invitation.", 500, true, {
      cause: error,
    });
  }

  return data ? hydrateInvitationRow(data) : null;
}

async function getOrganizationById(organizationId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_by_user_id, created_at, updated_at")
    .eq("id", organizationId)
    .single<InvitationOrganizationRow>();

  if (error || !data) {
    throw new AppError("Organization not found.", 404);
  }

  return data;
}

async function getMembershipById(membershipId: string) {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at"
    )
    .eq("id", membershipId)
    .single<InvitationMembershipRow>();

  if (error || !data) {
    throw new AppError("Organization membership not found.", 404);
  }

  return data;
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

  return (data ?? []).map<OrganizationInvitationSummary>((invitation) => {
    const hydratedInvitation = hydrateInvitationRow(invitation);

    return {
      invitation_id: hydratedInvitation.id,
      membership_id: hydratedInvitation.membership_id,
      email: hydratedInvitation.email,
      role: hydratedInvitation.role,
      invited_at: hydratedInvitation.invited_at,
      last_sent_at: hydratedInvitation.last_sent_at,
      send_count: hydratedInvitation.send_count,
      expires_at: hydratedInvitation.expires_at,
      accepted_by_user_id: hydratedInvitation.accepted_by_user_id,
      accepted_at: hydratedInvitation.accepted_at,
      revoked_by_user_id: hydratedInvitation.revoked_by_user_id,
      revoked_at: hydratedInvitation.revoked_at,
      membership_status: invitation.organization_members?.status ?? "invited",
    };
  });
}

export async function createOrganizationInvitation(
  authUserId: string,
  organizationId: string,
  input: CreateOrganizationInvitationInput
): Promise<OrganizationInvitationMutationResult> {
  const inviter = await getAppUserByAuthId(authUserId);
  const { organization } = await ensureOrganizationAdmin(inviter.id, organizationId);

  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date();
  const invitedAt = now.toISOString();
  const expiresAt = buildInvitationExpiryDate(now).toISOString();
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const acceptanceUrl = buildInvitationAcceptanceUrl(rawToken);
  const storedProfile = writeInvitationCompatibilityMetadata(buildStoredInvitationProfile(input), {
    token_hash: tokenHash,
    last_sent_at: invitedAt,
    send_count: 1,
    accepted_by_user_id: null,
    revoked_by_user_id: null,
  });

  const { data: invitation, error: invitationError } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: organizationId,
      email: normalizedEmail,
      role: input.role,
      profile: storedProfile,
      invited_by_user_id: inviter.id,
      invited_at: invitedAt,
      expires_at: expiresAt,
    })
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .single<
      Omit<
        OrganizationInvitationRow,
        "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"
      >
    >();

  if (invitationError || !invitation) {
    if (invitationError?.code === "23505") {
      throw new AppError("This organization invitation already exists.", 409);
    }

    throw new AppError("Unable to create organization invitation.", 400, true, {
      cause: invitationError,
    });
  }

  try {
    await createEmailService().sendOrganizationInvitation({
      to: normalizedEmail,
      organizationName: organization.name,
      invitedRole: input.role,
      acceptanceUrl,
      expiresAt,
      invitationId: invitation.id,
      organizationId,
    });
  } catch (error) {
    await supabase.from("organization_invitations").delete().eq("id", invitation.id);
    throw error;
  }

  logOrganizationEvent("organization_invitation_created", {
    inviterAppUserId: inviter.id,
    organizationId,
    role: input.role,
    invitationId: invitation.id,
  });

  return {
    invitation: mapInvitation(hydrateInvitationRow(invitation)),
    membership: null,
  };
}

export async function inspectInvitationByToken(
  token: string,
  authUserId?: string
): Promise<InvitationInspectionResult> {
  if (!token.trim()) {
    throw new AppError("Invitation not found.", 404);
  }

  const tokenHash = hashInvitationToken(token);
  const invitation = await getInvitationByTokenHash(tokenHash);

  if (
    !invitation?.token_hash ||
    !invitationTokenHashesMatch(invitation.token_hash, tokenHash)
  ) {
    throw new AppError("Invitation not found.", 404);
  }

  const organization = await getOrganizationById(invitation.organization_id);
  const status = getInvitationPublicStatus(invitation);

  let currentUserEmailMatches = false;
  if (authUserId) {
    const appUser = await getAppUserByAuthId(authUserId);
    currentUserEmailMatches = normalizeEmail(appUser.email ?? "") === normalizeEmail(invitation.email);
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    invited_email_masked: maskInvitationEmail(invitation.email),
    role: invitation.role,
    expires_at: invitation.expires_at,
    status,
    authentication_required: !authUserId,
    current_user_email_matches: authUserId ? currentUserEmailMatches : null,
  };
}

export async function acceptInvitationByToken(
  token: string,
  authUserId: string
): Promise<InvitationAcceptanceResult> {
  if (!token.trim()) {
    throw new AppError("Invitation not found.", 404);
  }

  const tokenHash = hashInvitationToken(token);
  const invitation = await getInvitationByTokenHash(tokenHash);

  if (
    !invitation?.token_hash ||
    !invitationTokenHashesMatch(invitation.token_hash, tokenHash)
  ) {
    throw new AppError("Invitation not found.", 404);
  }

  const organization = await getOrganizationById(invitation.organization_id);
  const appUser = await getAppUserByAuthId(authUserId);
  const normalizedUserEmail = normalizeEmail(appUser.email ?? "");
  const normalizedInvitationEmail = normalizeEmail(invitation.email);

  if (invitation.accepted_at) {
    throw new AppError("This invitation has already been accepted.", 409);
  }

  if (invitation.revoked_at) {
    throw new AppError("This invitation is no longer valid.", 410);
  }

  if (isInvitationExpired(invitation.expires_at)) {
    throw new AppError("This invitation has expired.", 410);
  }

  if (normalizedUserEmail !== normalizedInvitationEmail) {
    throw new AppError("This invitation does not match the authenticated account.", 403);
  }

  const membership = invitation.membership_id
    ? await getMembershipById(invitation.membership_id)
    : null;

  if (membership?.organization_id !== undefined && membership.organization_id !== invitation.organization_id) {
    throw new AppError("Invitation membership mismatch.", 409);
  }

  if (membership?.status === "active") {
    throw new AppError("This invitation has already been accepted.", 409);
  }

  if (membership?.status === "suspended") {
    throw new AppError("This membership is suspended.", 403);
  }

  if (membership && membership.user_id !== appUser.id) {
    throw new AppError("This invitation does not belong to the authenticated account.", 403);
  }

  let createdProfileRef: InvitationProfileProvisionResult["createdProfileRef"] = null;
  let profileCreated = false;
  let createdMembershipId: string | null = null;

  try {
    const profileProvision = await provisionInvitationProfile(
      invitation,
      appUser.id,
      invitation.organization_id
    );
    createdProfileRef = profileProvision.createdProfileRef;
    profileCreated = profileProvision.profileCreated;

    const acceptedAt = new Date().toISOString();
    const membershipResult = membership
      ? await supabase
          .from("organization_members")
          .update({ status: "active", joined_at: acceptedAt })
          .eq("id", membership.id)
          .eq("status", "invited")
          .select("id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at")
          .single<OrganizationMembershipRow>()
      : await supabase
          .from("organization_members")
          .insert({
            organization_id: invitation.organization_id,
            user_id: appUser.id,
            role: invitation.role,
            status: "active",
            invited_by_user_id: invitation.invited_by_user_id,
            invited_at: invitation.invited_at,
            joined_at: acceptedAt,
          })
          .select("id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at")
          .single<OrganizationMembershipRow>();

    const { data: activatedMembership, error: membershipError } = membershipResult;

    if (membershipError || !activatedMembership) {
      throw new AppError("Unable to activate organization membership.", 400, true, {
        cause: membershipError,
      });
    }
    if (!membership) {
      createdMembershipId = activatedMembership.id;
    }

    const { error: invitationUpdateError } = await supabase
      .from("organization_invitations")
      .update({
        user_id: appUser.id,
        membership_id: activatedMembership.id,
        accepted_at: acceptedAt,
        profile: writeInvitationCompatibilityMetadata(invitation.profile, {
          token_hash: invitation.token_hash,
          last_sent_at: invitation.last_sent_at,
          send_count: invitation.send_count,
          accepted_by_user_id: appUser.id,
          revoked_by_user_id: invitation.revoked_by_user_id,
        }),
      })
      .eq("id", invitation.id)
      .is("accepted_at", null);

    if (invitationUpdateError) {
      throw new AppError("Unable to mark the invitation as accepted.", 500, true, {
        cause: invitationUpdateError,
      });
    }

    logOrganizationEvent("organization_invitation_accepted_via_token", {
      appUserId: appUser.id,
      invitationId: invitation.id,
      membershipId: activatedMembership.id,
      organizationId: invitation.organization_id,
      role: invitation.role,
    });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        created_at: organization.created_at,
        created_by_user_id: organization.created_by_user_id,
        updated_at: organization.updated_at,
      },
      membership: mapMembership(activatedMembership),
      profileCreated,
    };
  } catch (error) {
    await rollbackCreatedInvitationProfile(createdProfileRef);
    if (createdMembershipId) {
      await supabase.from("organization_members").delete().eq("id", createdMembershipId);
    }
    throw error;
  }
}

export async function registerInvitationAccount(
  token: string,
  password: string
): Promise<AuthSessionResponse> {
  const invitation = await getInvitationByTokenHash(hashInvitationToken(token));

  if (!invitation?.token_hash || !invitationTokenHashesMatch(invitation.token_hash, hashInvitationToken(token))) {
    throw new AppError("Invitation not found.", 404);
  }
  if (invitation.accepted_at || invitation.revoked_at || isInvitationExpired(invitation.expires_at)) {
    throw new AppError("This invitation is no longer valid.", 410);
  }

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    throw new AppError("An account already exists for this invitation email. Sign in to accept it.", 409);
  }

  try {
    const appUser = await getOrCreateAppUserForInvitation({
      authUserId: createdUser.user.id,
      email: invitation.email,
      role: invitation.role,
    });
    await acceptInvitationByToken(token, createdUser.user.id);
    const { data: sessionData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: invitation.email,
      password,
    });
    if (signInError || !sessionData.session) {
      throw new AppError("Account created, but login failed.", 500);
    }
    const registeredUser = await getAppUserByAuthId(createdUser.user.id);
    return {
      user: registeredUser,
      onboarding: await getAuthOnboardingStateForAppUser(appUser.id),
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      expiresAt: sessionData.session.expires_at ?? null,
    };
  } catch (error) {
    await supabase.auth.admin.deleteUser(createdUser.user.id);
    throw error;
  }
}

export async function resendOrganizationInvitation(
  authUserId: string,
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitationMutationResult> {
  const inviter = await getAppUserByAuthId(authUserId);
  await ensureOrganizationAdmin(inviter.id, organizationId);

  const invitation = await getInvitationByIdForOrganization(organizationId, invitationId);
  const membership = invitation.membership_id
    ? await getMembershipById(invitation.membership_id)
    : null;

  if (invitation.accepted_at || membership?.status === "active") {
    throw new AppError("Accepted invitations cannot be resent.", 409);
  }

  if (invitation.revoked_at) {
    throw new AppError("Revoked invitations cannot be resent.", 409);
  }

  if (invitation.last_sent_at) {
    const elapsed = Date.now() - new Date(invitation.last_sent_at).getTime();
    if (elapsed < INVITATION_RESEND_COOLDOWN_MS) {
      throw new AppError("Please wait before resending this invitation.", 429);
    }
  }

  const now = new Date();
  const lastSentAt = now.toISOString();
  const expiresAt = buildInvitationExpiryDate(now).toISOString();
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const acceptanceUrl = buildInvitationAcceptanceUrl(rawToken);

  const organization = await getOrganizationById(organizationId);
  await createEmailService().sendOrganizationInvitation({
    to: invitation.email,
    organizationName: organization.name,
    invitedRole: invitation.role,
    acceptanceUrl,
    expiresAt,
    invitationId: invitation.id,
    organizationId,
  });

  const { data: updatedInvitation, error: updateError } = await supabase
    .from("organization_invitations")
    .update({
      profile: writeInvitationCompatibilityMetadata(invitation.profile, {
        token_hash: tokenHash,
        last_sent_at: lastSentAt,
        send_count: (invitation.send_count ?? 0) + 1,
        accepted_by_user_id: invitation.accepted_by_user_id,
        revoked_by_user_id: null,
      }),
      expires_at: expiresAt,
      revoked_at: null,
    })
    .eq("id", invitation.id)
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .single<
      Omit<
        OrganizationInvitationRow,
        "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"
      >
    >();

  if (updateError || !updatedInvitation) {
    throw new AppError("Unable to resend organization invitation.", 400, true, {
      cause: updateError,
    });
  }

  const hydratedUpdatedInvitation = hydrateInvitationRow(updatedInvitation);

  logOrganizationEvent("organization_invitation_resent", {
    inviterAppUserId: inviter.id,
    invitationId: invitation.id,
    membershipId: invitation.membership_id,
    organizationId,
    role: invitation.role,
    sendCount: hydratedUpdatedInvitation.send_count,
  });

  return {
    invitation: mapInvitation(hydratedUpdatedInvitation),
    membership: membership ? mapMembership(membership) : null,
  };
}

export async function revokeOrganizationInvitation(
  authUserId: string,
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitationMutationResult> {
  const revoker = await getAppUserByAuthId(authUserId);
  await ensureOrganizationAdmin(revoker.id, organizationId);

  const invitation = await getInvitationByIdForOrganization(organizationId, invitationId);
  const membership = invitation.membership_id
    ? await getMembershipById(invitation.membership_id)
    : null;

  if (invitation.accepted_at || membership?.status === "active") {
    throw new AppError("Accepted invitations cannot be revoked.", 409);
  }

  if (invitation.revoked_at) {
    throw new AppError("This invitation has already been revoked.", 409);
  }

  const revokedAt = new Date().toISOString();
  const { data: revokedInvitation, error: invitationError } = await supabase
    .from("organization_invitations")
    .update({
      revoked_at: revokedAt,
      profile: writeInvitationCompatibilityMetadata(invitation.profile, {
        token_hash: invitation.token_hash,
        last_sent_at: invitation.last_sent_at,
        send_count: invitation.send_count,
        accepted_by_user_id: invitation.accepted_by_user_id,
        revoked_by_user_id: revoker.id,
      }),
    })
    .eq("id", invitation.id)
    .select(
      "id, organization_id, user_id, membership_id, email, role, profile, invited_by_user_id, invited_at, expires_at, accepted_at, revoked_at, created_at"
    )
    .single<
      Omit<
        OrganizationInvitationRow,
        "token_hash" | "last_sent_at" | "send_count" | "accepted_by_user_id" | "revoked_by_user_id"
      >
    >();

  if (invitationError || !revokedInvitation) {
    throw new AppError("Unable to revoke organization invitation.", 400, true, {
      cause: invitationError,
    });
  }

  const suspendedMembership = membership
    ? await supabase
        .from("organization_members")
        .update({ status: "suspended" })
        .eq("id", membership.id)
        .eq("status", "invited")
        .select("id, organization_id, user_id, role, status, invited_by_user_id, invited_at, joined_at, created_at")
        .single<OrganizationMembershipRow>()
    : { data: null, error: null };

  if (suspendedMembership.error || (membership && !suspendedMembership.data)) {
    throw new AppError("Unable to revoke organization invitation.", 400, true, {
      cause: suspendedMembership.error,
    });
  }

  logOrganizationEvent("organization_invitation_revoked", {
    revokerAppUserId: revoker.id,
    invitationId: invitation.id,
    membershipId: invitation.membership_id,
    organizationId,
    role: invitation.role,
  });

  return {
    invitation: mapInvitation(hydrateInvitationRow(revokedInvitation)),
    membership: suspendedMembership.data ? mapMembership(suspendedMembership.data) : null,
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
        job_title: employeeProfile.job_title,
        department: employeeProfile.department,
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
