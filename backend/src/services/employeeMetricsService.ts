import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/appError.js";

export const ACTIVE_TASK_STATUSES = ["todo", "in_progress", "blocked", "review"] as const;

interface EmployeeWithCapacityFields {
  id: string;
  weekly_capacity_hours: number | null;
  availability_percentage?: number | null;
  workload_percentage?: number | null;
}

interface AssignedTaskMetricRow {
  assigned_employee_id: string | null;
  estimated_hours: number;
}

export function availabilityFromWorkload(workloadPercentage: number) {
  return Math.max(0, Math.min(100, 100 - workloadPercentage));
}

export function calculateWorkloadPercentage(
  assignedHours: number,
  weeklyCapacityHours: number
) {
  const normalizedAssignedHours = Number.isFinite(assignedHours)
    ? Math.max(0, assignedHours)
    : 0;
  const normalizedCapacityHours = Number(weeklyCapacityHours);

  if (!Number.isFinite(normalizedCapacityHours) || normalizedCapacityHours <= 0) {
    return normalizedAssignedHours > 0 ? 100 : 0;
  }

  return Math.min(
    100,
    Math.round((normalizedAssignedHours / normalizedCapacityHours) * 100)
  );
}

export async function enrichEmployeesWithCapacityMetrics<
  T extends EmployeeWithCapacityFields
>(employees: T[]) {
  if (employees.length === 0) {
    return employees;
  }

  const employeeIds = employees.map((employee) => employee.id);
  const { data, error } = await supabase
    .from("tasks")
    .select("assigned_employee_id, estimated_hours")
    .in("assigned_employee_id", employeeIds)
    .in("status", ACTIVE_TASK_STATUSES)
    .is("deleted_at", null)
    .returns<AssignedTaskMetricRow[]>();

  if (error) {
    throw new AppError("Unable to calculate employee capacity metrics.", 500);
  }

  const assignedHoursByEmployeeId = new Map<string, number>();

  for (const task of data ?? []) {
    if (!task.assigned_employee_id) {
      continue;
    }

    assignedHoursByEmployeeId.set(
      task.assigned_employee_id,
      (assignedHoursByEmployeeId.get(task.assigned_employee_id) ?? 0) +
        Number(task.estimated_hours)
    );
  }

  return employees.map((employee) => {
    const workloadPercentage = calculateWorkloadPercentage(
      assignedHoursByEmployeeId.get(employee.id) ?? 0,
      Number(employee.weekly_capacity_hours)
    );

    return {
      ...employee,
      workload_percentage: workloadPercentage,
      availability_percentage: availabilityFromWorkload(workloadPercentage),
    };
  });
}
