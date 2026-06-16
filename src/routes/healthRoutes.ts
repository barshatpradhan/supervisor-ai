import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

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

export default router;
