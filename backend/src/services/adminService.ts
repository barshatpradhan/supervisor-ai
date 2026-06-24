import { supabase } from "../config/supabase.js";
import type { UserRole } from "../types/auth.js";
import { AppError } from "../utils/appError.js";

const VALID_ROLES: UserRole[] = ["admin", "supervisor", "employee"];

export function isValidUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

export async function listAppUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("Unable to fetch users.", 500);
  }

  return data;
}

export async function updateAppUserRole(userId: string, role: UserRole) {
  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select("id, auth_user_id, email, role, created_at")
    .single();

  if (error) {
    throw new AppError("Unable to update user role.", 400);
  }

  return data;
}
