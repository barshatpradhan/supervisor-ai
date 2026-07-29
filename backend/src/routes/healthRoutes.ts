import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { env } from "../config/environment.js";
import { getDependencyHealth } from "../services/healthService.js";

const router = Router();

router.get("/supabase", async (req, res) => {
  const { error } = await supabase
    .from("users")
    .select("id")
    .limit(1);

    if(error) {
      return sendError(
        res,
        500,
        "Supabase connection failed.",
        "Database health check failed."
      );
    }

    return sendSuccess(res, 200, "Supabase connected successfully.");
})

router.get("/", async (_req, res) => {
  const health = await getDependencyHealth();
  return sendSuccess(res, health.status === "ok" ? 200 : 503, "Service health checked.", health);
});

router.get("/ready", async (_req, res) => {
  const health = await getDependencyHealth();
  if (health.status !== "ok") return sendError(res, 503, "Service is not ready.", "Required dependency is unavailable.");
  return sendSuccess(res, 200, "Service is ready.", health);
});

export default router;
