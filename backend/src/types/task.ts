import type { PriorityLevel } from "./project.js";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "review"
  | "completed"
  | "cancelled";

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: PriorityLevel;
  estimatedHours?: number;
  assignedEmployeeId?: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: PriorityLevel;
  estimatedHours?: number;
  dueDate?: string;
}

export interface AssignTaskInput {
  employeeId?: string;
}

export interface CreateTaskProgressInput {
  progressPercentage: number;
  notes?: string;
}

export interface EmployeeTaskListQuery {
  status?: TaskStatus;
  priority?: PriorityLevel;
  projectId?: string;
  dueBefore?: string;
  dueAfter?: string;
  page: number;
  limit: number;
  sort: "assignedAt" | "dueDate" | "priority" | "progress";
}
