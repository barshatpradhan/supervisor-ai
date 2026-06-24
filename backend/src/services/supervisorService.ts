import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";

export async function getSupervisorProfileByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("supervisors")
    .select(`
      id,
      full_name,
      department,
      bio,
      created_at,
      users!inner (
        id,
        auth_user_id,
        role
      )
    `)
    .eq("users.auth_user_id", authUserId)
    .single();

  if (error) {
    throw new AppError("Supervisor profile not found.", 404);
  }

  return data;
}

export async function createSupervisorProfile(
  authUserId: string,
  profileData: {
    full_name: string;
    department?: string;
    bio?: string;
  }
) {
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_user_id", authUserId)
    .single();

  if (userError || !appUser) {
    throw new AppError("Application user profile was not found.", 404);
  }

  if (appUser.role !== "supervisor") {
    throw new AppError("Only supervisor users can create supervisor profiles.", 403);
  }

  const { data, error } = await supabase
    .from("supervisors")
    .insert({
      user_id: appUser.id,
      full_name: profileData.full_name,
      department: profileData.department ?? null,
      bio: profileData.bio ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("Unable to create supervisor profile.", 400);
  }

  return data;
}
