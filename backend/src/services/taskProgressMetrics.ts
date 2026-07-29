import type { TaskStatus } from "../types/task.js";

export function statusForProgress(progressPercentage: number): TaskStatus {
  return progressPercentage === 0 ? "todo" : progressPercentage === 100 ? "completed" : "in_progress";
}

export function projectProgressFromHours(tasks: Array<{ status: TaskStatus; estimatedHours: number }>) {
  const total = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  const completed = tasks.filter((task) => task.status === "completed").reduce((sum, task) => sum + task.estimatedHours, 0);
  return total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((completed / total) * 10000) / 100));
}
