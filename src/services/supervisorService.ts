import { supabase } from "../config/supabase.js";

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
    throw new Error(error.message);
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
    throw new Error("App user not found");
  }

  if (appUser.role !== "supervisor") {
    throw new Error("Only supervisor users can create supervisor profiles");
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
    throw new Error(error.message);
  }

  return data;
}
