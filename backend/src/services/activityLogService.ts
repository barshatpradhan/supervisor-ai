import { supabase } from "../config/supabase.js";

export type ActivityEventType =
  | "task_progress_updated"
  | "task_completed"
  | "project_progress_updated"
  | "employee_dashboard_viewed"
  | "supervisor_dashboard_viewed";

/** Audit metadata is deliberately identifiers and calculated values only. */
export async function logActivity(input: {
  organizationId: string;
  actorUserId: string;
  eventType: ActivityEventType;
  taskId?: string;
  projectId?: string;
  metadata?: Record<string, number | string | boolean | null>;
}) {
  const { error } = await supabase.from("activity_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    task_id: input.taskId ?? null,
    project_id: input.projectId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });

  // Auditing must not make a completed business operation unavailable.
  if (error) {
    console.warn(JSON.stringify({ scope: "activity_log", event: "write_failed", type: input.eventType }));
  }
}
