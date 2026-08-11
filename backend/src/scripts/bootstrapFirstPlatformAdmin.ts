import { supabase } from "../config/supabase.js";

const REQUIRED_CONFIRMATION = "grant-first-platform-admin";

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

async function bootstrapFirstPlatformAdmin() {
  const email = requiredEnvironment("PLATFORM_ADMIN_BOOTSTRAP_EMAIL").toLowerCase();
  const confirmation = requiredEnvironment("PLATFORM_ADMIN_BOOTSTRAP_CONFIRM");

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error("PLATFORM_ADMIN_BOOTSTRAP_CONFIRM does not contain the required confirmation value.");
  }

  const { data: existingAdmins, error: existingAdminsError } = await supabase
    .from("users")
    .select("id")
    .eq("platform_role", "platform_admin")
    .limit(1);

  if (existingAdminsError) {
    throw new Error("Unable to verify whether a platform administrator already exists.");
  }

  if ((existingAdmins ?? []).length > 0) {
    throw new Error("Bootstrap refused: a platform administrator already exists.");
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id, auth_user_id, email, platform_role")
    .eq("email", email)
    .maybeSingle<{ id: string; auth_user_id: string; email: string | null; platform_role: string | null }>();

  if (appUserError || !appUser) {
    throw new Error("Bootstrap refused: no application user exists for the configured email.");
  }

  const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(
    appUser.auth_user_id
  );

  const authEmail = authResult.user?.email?.trim().toLowerCase();
  if (authError || !authResult.user || authEmail !== email || !authResult.user.email_confirmed_at) {
    throw new Error("Bootstrap refused: the configured account must be a confirmed Supabase Auth user.");
  }

  const { data: promotedUserId, error: updateError } = await supabase.rpc(
    "bootstrap_first_platform_admin",
    { target_user_id: appUser.id }
  );

  if (updateError || promotedUserId !== appUser.id) {
    throw new Error("Bootstrap refused: the target account could not be promoted safely.");
  }

  console.log("First platform administrator bootstrapped successfully.");
}

bootstrapFirstPlatformAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Platform administrator bootstrap failed.");
  process.exitCode = 1;
});
