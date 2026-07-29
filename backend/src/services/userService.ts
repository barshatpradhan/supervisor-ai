import { supabase } from "../config/supabase.js";
import type {
  AuthenticatedAppUser,
  AuthOnboardingState,
  LegacyUserRole,
  PlatformRole,
} from "../types/auth.js";
import { AppError } from "../utils/appError.js";

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: LegacyUserRole | null;
  platform_role: PlatformRole | null;
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
  };
}

export async function getAppUserByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role")
    .eq("auth_user_id", authUserId)
    .single<AppUserRow>();

  if (error || !data) {
    throw new AppError("Application user profile was not found.", 404);
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

export function assertPlatformRole(
  user: AuthenticatedAppUser,
  allowedRoles: readonly PlatformRole[]
) {
  if (!user.platformRole || !allowedRoles.includes(user.platformRole)) {
    throw new AppError("Forbidden.", 403);
  }
}
