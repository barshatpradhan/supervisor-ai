import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./config/supabase.js";
import { requireRole } from "./middleware/roleMiddleware.js";
import { authenticateUser } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "AI Supervisor Assistant Backend running"
  });
});

app.get("/api/health/supabase", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .limit(1);

  if (error) {
    return res.status(500).json({
      success: false,
      message: "Supabase connection failed",
      error: error.message
    });
  }

  return res.json({
    success: true,
    message: "Supabase connected successfully",
    data,
  });
});

app.get(
  "/api/admin/dashboard",
  authenticateUser,
  requireRole("admin"),
  (req, res) => {
    return res.json({
      success: true,
      message: "Welcome admin"
    });
  }
)

app.listen(PORT, () => {
  console.log(`Server is running on the port http://localhost:${PORT}`);
});