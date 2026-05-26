import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

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


app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use ("/api/health", healthRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on the port http://localhost:${PORT}`);
});