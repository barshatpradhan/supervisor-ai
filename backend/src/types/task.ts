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
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: PriorityLevel;
  estimatedHours?: number;
}

export interface AssignTaskInput {
  employeeId?: string;
}

export interface CreateTaskProgressInput {
  progressPercentage: number;
  status?: TaskStatus;
  notes?: string;
}
