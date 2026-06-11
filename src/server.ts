import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";



const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "AI Supervisor Assistant Backend running"
  });
});


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/supervisors", supervisorRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on the port http://localhost:${PORT}`);
});
