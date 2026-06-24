import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sendSuccess } from "./utils/apiResponse.js";



const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  return sendSuccess(res, 200, "AI Supervisor Assistant Backend running.");
});


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/supervisors", supervisorRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on the port http://localhost:${PORT}`);
});
