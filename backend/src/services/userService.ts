import { supabase } from "../config/supabase.js";
import type {
  AuthenticatedAppUser,
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

function mapAppUser(row: AppUserRow): AuthenticatedAppUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email ?? "",
    platformRole: row.platform_role,
    legacyRole: row.role,
    role: row.role,
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

export function assertPlatformRole(
  user: AuthenticatedAppUser,
  allowedRoles: readonly PlatformRole[]
) {
  if (!user.platformRole || !allowedRoles.includes(user.platformRole)) {
    throw new AppError("Forbidden.", 403);
  }
}
