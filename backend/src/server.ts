import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";
import { supabase } from "./config/supabase.js";
import { getDependencyHealth } from "./services/healthService.js";
import { env } from "./config/environment.js";
import { requestContext, metricsText } from "./middleware/observabilityMiddleware.js";
import { rateLimit, securityHeaders } from "./middleware/securityMiddleware.js";
import { openApiDocument } from "./docs/openapi.js";



const app = express();

app.disable("x-powered-by");
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({ origin(origin, callback) { if (!origin || env.corsOrigins.includes(origin)) return callback(null, true); return callback(new Error("CORS origin is not allowed.")); }, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Authorization", "Content-Type", "X-Organization-Id", "X-Request-Id"] }));
app.use(express.json({ limit: env.jsonLimit }));
app.use(rateLimit);

app.get("/", (req, res) => {
  return sendSuccess(res, 200, "AI Supervisor Assistant Backend running.");
});
app.get("/health", async (_req, res) => {
  const health = await getDependencyHealth();
  return sendSuccess(res, health.status === "ok" ? 200 : 503, "Service health checked.", health);
});
app.get("/ready", async (_req, res) => {
  const health = await getDependencyHealth();
  return health.status !== "ok" ? sendError(res, 503, "Service is not ready.", "Required dependency is unavailable.") : sendSuccess(res, 200, "Service is ready.", health);
});
app.get("/metrics", (_req, res) => { res.type("text/plain"); return res.send(metricsText()); });
app.get("/api/openapi.json", (_req, res) => res.json(openApiDocument));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/supervisors", supervisorRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/invitations", invitationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running on the port http://localhost:${env.port}`);
});
