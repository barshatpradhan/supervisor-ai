export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: ProjectStatus;
  priority?: PriorityLevel;
  requiredSkills?: string[];
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: PriorityLevel;
  requiredSkills?: string[];
}
