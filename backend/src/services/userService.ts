import { supabase } from "../config/supabase.js";
import type {
  AuthenticatedAppUser,
  AuthOnboardingState,
  LegacyUserRole,
  PlatformRole,
} from "../types/auth.js";
import { AppError } from "../utils/appError.js";
import { readStoredAvatarVariant } from "../utils/avatarVariant.js";

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: LegacyUserRole | null;
  platform_role: PlatformRole | null;
  avatar_variant?: string | null;
}

function mapLegacyCompatibilityRole(row: AppUserRow): LegacyUserRole | null {
  if (row.role === "admin" && row.platform_role === null) {
    return null;
  }

  return row.role;
}

function mapAppUser(row: AppUserRow): AuthenticatedAppUser {
  const legacyRole = mapLegacyCompatibilityRole(row);

  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email ?? "",
    platformRole: row.platform_role,
    legacyRole,
    role: legacyRole,
    avatarVariant: readStoredAvatarVariant(row.avatar_variant),
  };
}

export async function getAppUserByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role, avatar_variant")
    .eq("auth_user_id", authUserId)
    .single<AppUserRow>();

  if (error || !data) {
    throw new AppError("Application user profile was not found.", 404);
  }

  return mapAppUser(data);
}

/**
 * Sets the caller's own avatar. The row is chosen only by the verified app user id from the
 * auth context, never by anything in the request body, so nobody can change another person's.
 */
export async function updateOwnAvatarVariant(appUserId: string, variant: string | null) {
  const { data, error } = await supabase
    .from("users")
    .update({ avatar_variant: variant })
    .eq("id", appUserId)
    .select("id, auth_user_id, email, role, platform_role, avatar_variant")
    .single<AppUserRow>();

  if (error || !data) {
    throw new AppError("Unable to update your avatar.", 500, true, { cause: error });
  }

  return mapAppUser(data);
}

interface OrganizationMembershipStatusRow {
  status: "invited" | "active" | "suspended";
}

export async function getAuthOnboardingStateForAppUser(
  appUserId: string
): Promise<AuthOnboardingState> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("status")
    .eq("user_id", appUserId)
    .returns<OrganizationMembershipStatusRow[]>();

  if (error) {
    throw new AppError("Unable to resolve onboarding state.", 500);
  }

  const hasActiveOrganization = (data ?? []).some(
    (membership) => membership.status === "active"
  );
  const hasPendingInvitations = (data ?? []).some(
    (membership) => membership.status === "invited"
  );

  return {
    hasActiveOrganization,
    requiresOrganizationCreation: !hasActiveOrganization && !hasPendingInvitations,
    hasPendingInvitations,
  };
}

