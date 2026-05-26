import { supabase } from "../config/supabase.js";

export async function getEmployeeProfileByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from("empoyees")
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
    .eq("user.auth_user_id", authUserId)
    .single();

    if(error) {
      throw new Error(error.message);
    }

    return data;
}

