import crypto from "node:crypto";

interface Envelope<T> { success: boolean; message: string; data?: T; }
interface Project { id: string; progress_percentage?: number; }
interface Task { id: string; status: string; completed_at: string | null; }

const baseUrl = process.env.TASK_PROGRESS_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";
const organizationId = process.env.TASK_PROGRESS_ORGANIZATION_ID;
const supervisorToken = process.env.TASK_PROGRESS_SUPERVISOR_TOKEN;
const employeeToken = process.env.TASK_PROGRESS_EMPLOYEE_TOKEN;
const employeeId = process.env.TASK_PROGRESS_EMPLOYEE_ID;

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function api<T>(path: string, token: string, method = "GET", body?: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "X-Organization-Id": required(organizationId, "TASK_PROGRESS_ORGANIZATION_ID"), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json() as Envelope<T>;
  if (!response.ok || !payload.success || !payload.data) throw new Error(`${method} ${path} failed: ${payload.message}`);
  return payload.data;
}

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const supervisor = required(supervisorToken, "TASK_PROGRESS_SUPERVISOR_TOKEN");
  const employee = required(employeeToken, "TASK_PROGRESS_EMPLOYEE_TOKEN");
  const assignee = required(employeeId, "TASK_PROGRESS_EMPLOYEE_ID");
  const project = await api<Project>("/projects", supervisor, "POST", { title: `Task progress verification ${suffix}`, status: "active" });
  const task = await api<Task>("/tasks", supervisor, "POST", { projectId: project.id, title: "Verification task", estimatedHours: 8, assignedEmployeeId: assignee });
  const partial = await api<{ progress: { progress_percentage: number } }>(`/tasks/${task.id}/progress`, employee, "PATCH", { progressPercentage: 65, notes: "Verification progress" });
  assert(partial.progress.progress_percentage === 65, "Progress history was not appended.");
  const completed = await api<{ task: Task; project_progress_percentage: number }>(`/tasks/${task.id}/progress`, employee, "PATCH", { progressPercentage: 100 });
  assert(completed.task.status === "completed" && completed.task.completed_at, "Task did not complete.");
  assert(completed.project_progress_percentage === 100, "Project did not reach expected progress.");
  const dashboard = await api<{ workSummary: { completed_tasks: number; workload_percentage: number } }>("/employees/me/dashboard", employee);
  assert(dashboard.workSummary.completed_tasks >= 1, "Employee dashboard did not reflect completion.");
  console.log(JSON.stringify({ scope: "task_progress_verification", event: "passed", projectId: project.id, taskId: task.id }));
}

void main();
