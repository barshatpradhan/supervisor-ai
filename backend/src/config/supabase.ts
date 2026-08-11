import { createClient } from "@supabase/supabase-js";
import { env } from "./environment.js";

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  }
);

export const supabaseAuth = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      // The browser receives the recovery token in the URL fragment, which it
      // then presents once to the password-confirmation endpoint.
      flowType: "implicit",
    },
  }
);
