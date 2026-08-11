import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "./environment.js";

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    // Supabase Realtime requires an explicit WebSocket implementation on
    // Node.js versions before 22 (including Render's current Node 20 service).
    realtime: { transport: ws as any },
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
    realtime: { transport: ws as any },
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
