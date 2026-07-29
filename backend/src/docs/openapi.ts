export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "AI Supervisor API", version: "1.0.0", description: "Tenant-scoped REST API. Supply X-Organization-Id on organization resources." },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }, organizationContext: { type: "apiKey", in: "header", name: "X-Organization-Id" } },
    schemas: {
      Error: { type: "object", required: ["success", "message", "error"], properties: { success: { type: "boolean", const: false }, message: { type: "string" }, error: { type: "string" } } },
      ProgressUpdate: { type: "object", required: ["progressPercentage"], properties: { progressPercentage: { type: "integer", minimum: 0, maximum: 100 }, notes: { type: "string", maxLength: 4000 } } },
      Success: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean", const: true }, message: { type: "string" }, data: {} } },
    },
    responses: {
      Unauthorized: { description: "Missing or invalid JWT", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Forbidden: { description: "Organization role or tenant access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
  security: [{ bearerAuth: [], organizationContext: [] }],
  paths: {
    "/health": { get: { security: [], summary: "Liveness health check", responses: { "200": { description: "Healthy" } } } },
    "/ready": { get: { security: [], summary: "Readiness health check", responses: { "200": { description: "Ready" }, "503": { description: "Dependency unavailable" } } } },
    "/tasks/{taskId}": { get: { summary: "Get task and progress history", parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Task", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } } } },
    "/tasks/{taskId}/progress": { patch: { summary: "Append task progress", parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProgressUpdate" }, example: { progressPercentage: 65, notes: "Completed API implementation." } } } }, responses: { "200": { description: "Progress updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } }, "400": { description: "Validation error" }, "403": { $ref: "#/components/responses/Forbidden" } } } },
    "/employees/me/tasks": { get: { summary: "List caller assigned tasks", parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1 } }], responses: { "200": { description: "Paginated tasks" } } } },
    "/employees/me/dashboard": { get: { summary: "Employee dashboard", responses: { "200": { description: "Dashboard" } } } },
    "/supervisors/dashboard": { get: { summary: "Supervisor dashboard", responses: { "200": { description: "Dashboard" } } } },
  },
} as const;
