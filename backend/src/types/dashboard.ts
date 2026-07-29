import type { UserRole } from "./auth.js";
import type { DocumentExtractionStatus } from "./document.js";
import type { EmploymentType } from "./employee.js";
import type { PriorityLevel, ProjectStatus } from "./project.js";
import type { TaskStatus } from "./task.js";

export interface DashboardProjectSummaryItem {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  updated_at: string;
}

export interface DashboardTaskSummaryItem {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  status: TaskStatus;
  priority: PriorityLevel;
  assigned_employee_id: string | null;
  updated_at: string;
}

export interface DashboardEmployeeWorkloadRecord {
  id: string;
  full_name: string;
  employment_type: "full_time" | "part_time";
  weekly_capacity_hours: number;
  workload_percentage: number;
  availability_percentage: number;
  performance_score: number | null;
}

export interface DashboardAnalyzedProject {
  project_id: string;
  title: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  document_id: string;
  analysis_id: string;
  analyzed_at: string;
}

export interface DashboardRecommendationTopCandidate {
  employee_id: string;
  employee_name: string;
  rank: number;
  match_score: number;
  confidence_score: number;
  summary: string;
}

export interface DashboardRecommendationRunSummary {
  project_id: string;
  project_title: string;
  analysis_id: string | null;
  recommendation_run_id: string;
  created_at: string;
  top_candidate: DashboardRecommendationTopCandidate | null;
}

export interface DashboardProjectProgressSummary {
  project_id: string;
  title: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  total_task_count: number;
  completed_task_count: number;
  progress_percentage: number;
  updated_at: string;
}

export interface SupervisorDashboardProjectsSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  by_status: Record<ProjectStatus, number>;
  by_priority: Record<PriorityLevel, number>;
  recently_updated_projects: DashboardProjectSummaryItem[];
}

export interface SupervisorDashboardTasksSummary {
  total_tasks: number;
  unassigned_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_status: Record<TaskStatus, number>;
  recent_tasks: DashboardTaskSummaryItem[];
  recent_assignments: DashboardTaskSummaryItem[];
}

export interface SupervisorDashboardEmployeesSummary {
  total_employees: number;
  available_employees: number;
  high_workload_employees: number;
  average_workload: number;
  average_availability: number;
  top_workloads: DashboardEmployeeWorkloadRecord[];
}

export interface SupervisorDashboardDocumentsSummary {
  total_uploaded_documents: number;
  by_extraction_status: Record<DocumentExtractionStatus, number>;
  projects_with_completed_analysis: number;
  recent_analyzed_projects: DashboardAnalyzedProject[];
}

export interface SupervisorDashboardRecommendationsSummary {
  projects_with_recommendation_runs: number;
  latest_recommendation_run: DashboardRecommendationRunSummary | null;
  latest_top_ranked_candidate: DashboardRecommendationTopCandidate | null;
  recent_recommendation_runs: DashboardRecommendationRunSummary[];
}

export interface SupervisorDashboardResponse {
  projects: SupervisorDashboardProjectsSummary;
  tasks: SupervisorDashboardTasksSummary;
  employees: SupervisorDashboardEmployeesSummary;
  documents: SupervisorDashboardDocumentsSummary;
  recommendations: SupervisorDashboardRecommendationsSummary;
  projectProgress: DashboardProjectProgressSummary[];
}

export type SupervisorDashboardAuthorizedRole = Extract<UserRole, "admin" | "supervisor">;

export interface EmployeeDashboardWorkSummary {
  assigned_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  workload_percentage: number;
  availability_percentage: number;
  weekly_capacity_hours: number;
}

export interface EmployeeDashboardAssignment {
  task_id: string;
  title: string;
  description: string | null;
  project_id: string;
  project_title: string;
  priority: PriorityLevel;
  status: TaskStatus;
  estimated_hours: number;
  assigned_at: string | null;
  current_progress_percentage: number;
  latest_progress_status: TaskStatus | null;
  latest_progress_notes: string | null;
  last_progress_at: string | null;
}

export interface EmployeeDashboardRecentProgressItem {
  progress_id: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_title: string;
  progress_percentage: number;
  status: TaskStatus | null;
  notes: string | null;
  created_at: string;
}

export interface EmployeeDashboardProfileSummary {
  employee_id: string;
  full_name: string;
  bio: string | null;
  employment_type: EmploymentType;
  weekly_capacity_hours: number;
  workload_percentage: number;
  availability_percentage: number;
  performance_score: number | null;
  approved_skills: string[];
  pending_skills: string[];
}

export interface EmployeeDashboardAttentionSummary {
  blocked_tasks: EmployeeDashboardAssignment[];
  unstarted_assigned_tasks: EmployeeDashboardAssignment[];
  tasks_requiring_progress_update: EmployeeDashboardAssignment[];
}

export interface EmployeeDashboardResponse {
  workSummary: EmployeeDashboardWorkSummary;
  currentAssignments: EmployeeDashboardAssignment[];
  recentProgress: EmployeeDashboardRecentProgressItem[];
  profile: EmployeeDashboardProfileSummary;
  attention: EmployeeDashboardAttentionSummary;
}

export type EmployeeDashboardAuthorizedRole = Extract<UserRole, "employee">;
