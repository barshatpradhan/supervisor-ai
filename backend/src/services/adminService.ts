import { supabase } from "../config/supabase.js";
import type { LegacyUserRole, PlatformRole, UserRole } from "../types/auth.js";
import { AppError } from "../utils/appError.js";

const VALID_ROLES: UserRole[] = ["admin", "supervisor", "employee"];

export function isValidUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

/** True when an application user with this id exists. */
export async function appUserExists(userId: string) {
  const { data, error } = await supabase.from("users").select("id").eq("id", userId).maybeSingle<{ id: string }>();
  if (error) throw new AppError("Unable to look up the user.", 500, true, { cause: error });
  return Boolean(data);
}

export async function listAppUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, platform_role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("Unable to fetch users.", 500);
  }

  return data;
}

export async function countOrganizations() {
  const { count, error } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new AppError("Unable to count organizations.", 500);
  }

  return count ?? 0;
}

function mapLegacyRoleToPlatformRole(role: LegacyUserRole): PlatformRole | null {
  return role === "admin" ? "platform_admin" : null;
}

export async function updateAppUserRole(userId: string, role: UserRole) {
  const { data, error } = await supabase
    .from("users")
    .update({
      role,
      platform_role: mapLegacyRoleToPlatformRole(role),
    })
    .eq("id", userId)
    .select("id, auth_user_id, email, role, platform_role, created_at")
    .single();

  if (error) {
    throw new AppError("Unable to update user role.", 400);
  }

  return data;
}
