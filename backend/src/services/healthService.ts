import { env } from "../config/environment.js";
import { supabase } from "../config/supabase.js";
import { PROJECT_DOCUMENT_BUCKET } from "../middleware/uploadMiddleware.js";

export async function getDependencyHealth() {
  const [database, storage] = await Promise.all([
    supabase.from("users").select("id").limit(1),
    supabase.storage.from(PROJECT_DOCUMENT_BUCKET).list("", { limit: 1 }),
  ]);
  return {
    status: database.error || storage.error ? "degraded" : "ok",
    api: "ok",
    database: database.error ? "unavailable" : "ok",
    storage: storage.error ? "unavailable" : "ok",
    gemini: env.geminiConfigured ? "configured" : "not_configured",
    uptime: process.uptime(),
    version: env.apiVersion,
  };
}
