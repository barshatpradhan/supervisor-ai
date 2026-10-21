/**
 * The assigned_at value to store when a task is (re)assigned.
 *
 * assigned_at marks when the current assignee got the task, so it only moves when the assignee
 * actually changes. Re-saving the same assignee keeps it, which keeps the employee's project
 * channel history (their messaging cutoff is the earliest assigned_at in the project).
 */
export function nextAssignedAt(
  current: { assigned_employee_id: string | null; assigned_at: string | null },
  nextEmployeeId: string | null,
  now: Date = new Date()
): string | null {
  if (!nextEmployeeId) return null;
  if (nextEmployeeId === current.assigned_employee_id && current.assigned_at) return current.assigned_at;
  return now.toISOString();
}
