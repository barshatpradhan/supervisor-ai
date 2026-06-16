import { supabase } from "../config/supabase.js";
import type { AuthenticatedAppUser, UserRole } from "../types/auth.js";
import { AppError } from "../utils/appError.js";

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: UserRole;
}

function mapAppUser(row: AppUserRow): AuthenticatedAppUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email ?? "",
    role: row.role,
  };
}

export async function getAppUserByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("auth_user_id", authUserId)
    .single<AppUserRow>();

  if (error || !data) {
    throw new AppError("Application user profile was not found.", 404);
  }

  return mapAppUser(data);
}

export function assertRole(user: AuthenticatedAppUser, allowedRoles: readonly UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new AppError("Forbidden.", 403);
  }
}
