import { availableMemory } from "node:process";
import { supabase } from "../config/supabase.js";

export async function getEmployeeProfileByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      full_name,
      availability_percentage,
      workload_percentage,
      bio,
      performance_score,
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

export async function createEmployeeProfile(
  authUserId: string,
  profileData: {
    full_name: string;
    bio?: string;
    employment_type?: "full_time" | "part_time";
    weekly_capacity_hours?: number;
  }
) {
  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (userError || !appUser) {
    throw new Error("App user not found");
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      user_id: appUser.id,
      full_name: profileData.full_name,
      bio: profileData.bio ?? null,
      employment_type: profileData.employment_type ?? "full_time",
      weekly_capacity_hours: profileData.weekly_capacity_hours ?? 40,
      workload_percentage: 0,
      availability_percentage: 100,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data;
}