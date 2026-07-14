import { supabase } from "../config/supabase.js";
import {
  ACTIVE_TASK_STATUSES,
  availabilityFromWorkload,
  calculateWorkloadPercentage,
} from "./employeeMetricsService.js";
import type {
  DashboardAnalyzedProject,
  DashboardEmployeeWorkloadRecord,
  DashboardProjectProgressSummary,
  DashboardRecommendationRunSummary,
  DashboardRecommendationTopCandidate,
  SupervisorDashboardResponse,
} from "../types/dashboard.js";
import type { UserRole } from "../types/auth.js";
import type { DocumentExtractionStatus } from "../types/document.js";
import type { PriorityLevel, ProjectStatus } from "../types/project.js";
import type { TaskStatus } from "../types/task.js";
import { AppError } from "../utils/appError.js";
import { assertRole, getAppUserByAuthId } from "./userService.js";

const RECENT_ITEM_LIMIT = 5;
const HIGH_WORKLOAD_THRESHOLD = 80;
const ACTIVE_TASK_STATUS_SET = new Set<string>(ACTIVE_TASK_STATUSES);

interface DashboardProjectRow {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  updated_at: string;
}

interface DashboardTaskRow {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  priority: PriorityLevel;
  assigned_employee_id: string | null;
  estimated_hours: number;
  updated_at: string;
}

interface DashboardEmployeeRow {
  id: string;
  full_name: string;
  employment_type: "full_time" | "part_time";
  weekly_capacity_hours: number | null;
  performance_score: number | null;
}

interface DashboardDocumentRow {
  id: string;
  project_id: string;
  extraction_status: DocumentExtractionStatus;
}

interface DashboardAnalysisRow {
  id: string;
  document_id: string;
  project_id: string;
  created_at: string;
}

interface DashboardRecommendationTopRow {
  project_id: string;
  analysis_id: string | null;
  recommendation_run_id: string;
  employee_id: string;
  rank: number;
  match_score: number;
  confidence_score: number;
  summary: string;
  created_at: string;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function createProjectStatusCounts(): Record<ProjectStatus, number> {
  return {
    active: 0,
    cancelled: 0,
    completed: 0,
    draft: 0,
    on_hold: 0,
  };
}

function createPriorityCounts(): Record<PriorityLevel, number> {
  return {
    high: 0,
    low: 0,
    medium: 0,
    urgent: 0,
  };
}

function createTaskStatusCounts(): Record<TaskStatus, number> {
  return {
    blocked: 0,
    cancelled: 0,
    completed: 0,
    in_progress: 0,
    review: 0,
    todo: 0,
  };
}

function createDocumentStatusCounts(): Record<DocumentExtractionStatus, number> {
  return {
    extracted: 0,
    failed: 0,
    pending: 0,
  };
}

async function listProjectsForDashboard() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, priority, updated_at")
    .is("deleted_at", null)
    .returns<DashboardProjectRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard projects.", 500);
  }

  return data ?? [];
}

async function listTasksForDashboard() {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, project_id, title, status, priority, assigned_employee_id, estimated_hours, updated_at"
    )
    .is("deleted_at", null)
    .returns<DashboardTaskRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard tasks.", 500);
  }

  return data ?? [];
}

async function listEmployeesForDashboard() {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, employment_type, weekly_capacity_hours, performance_score"
    )
    .returns<DashboardEmployeeRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard employees.", 500);
  }

  return data ?? [];
}

async function listProjectDocumentsForDashboard() {
  const { data, error } = await supabase
    .from("project_documents")
    .select("id, project_id, extraction_status")
    .returns<DashboardDocumentRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard documents.", 500);
  }

  return data ?? [];
}

async function listProjectAnalysesForDashboard() {
  const { data, error } = await supabase
    .from("project_document_analyses")
    .select("id, document_id, project_id, created_at")
    .order("created_at", { ascending: false })
    .returns<DashboardAnalysisRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard document analyses.", 500);
  }

  return data ?? [];
}

async function listTopRecommendationRowsForDashboard() {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select(
      "project_id, analysis_id, recommendation_run_id, employee_id, rank, match_score, confidence_score, summary, created_at"
    )
    .eq("rank", 1)
    .order("created_at", { ascending: false })
    .returns<DashboardRecommendationTopRow[]>();

  if (error) {
    throw new AppError("Unable to fetch dashboard recommendations.", 500);
  }

  return data ?? [];
}

function buildProjectMap(projects: DashboardProjectRow[]) {
  return new Map(projects.map((project) => [project.id, project]));
}

function buildEmployeeMap(employees: DashboardEmployeeWorkloadRecord[]) {
  return new Map(employees.map((employee) => [employee.id, employee]));
}

function buildAssignedHoursByEmployeeId(tasks: DashboardTaskRow[]) {
  const assignedHoursByEmployeeId = new Map<string, number>();

  for (const task of tasks) {
    if (!task.assigned_employee_id || !ACTIVE_TASK_STATUS_SET.has(task.status)) {
      continue;
    }

    assignedHoursByEmployeeId.set(
      task.assigned_employee_id,
      (assignedHoursByEmployeeId.get(task.assigned_employee_id) ?? 0) +
        Number(task.estimated_hours)
    );
  }

  return assignedHoursByEmployeeId;
}

function buildEmployeeWorkloadRecords(
  employees: DashboardEmployeeRow[],
  tasks: DashboardTaskRow[]
) {
  const assignedHoursByEmployeeId = buildAssignedHoursByEmployeeId(tasks);

  return employees.map<DashboardEmployeeWorkloadRecord>((employee) => {
    const workloadPercentage = calculateWorkloadPercentage(
      assignedHoursByEmployeeId.get(employee.id) ?? 0,
      Number(employee.weekly_capacity_hours)
    );

    return {
      id: employee.id,
      full_name: employee.full_name,
      employment_type: employee.employment_type,
      weekly_capacity_hours: Number(employee.weekly_capacity_hours ?? 0),
      workload_percentage: workloadPercentage,
      availability_percentage: availabilityFromWorkload(workloadPercentage),
      performance_score:
        employee.performance_score === null ? null : Number(employee.performance_score),
    };
  });
}

function buildRecentAnalyzedProjects(
  analyses: DashboardAnalysisRow[],
  projectById: Map<string, DashboardProjectRow>
) {
  const seenProjectIds = new Set<string>();
  const recentAnalyzedProjects: DashboardAnalyzedProject[] = [];

  for (const analysis of analyses) {
    if (seenProjectIds.has(analysis.project_id)) {
      continue;
    }

    const project = projectById.get(analysis.project_id);

    if (!project) {
      continue;
    }

    seenProjectIds.add(analysis.project_id);
    recentAnalyzedProjects.push({
      project_id: project.id,
      title: project.title,
      status: project.status,
      priority: project.priority,
      document_id: analysis.document_id,
      analysis_id: analysis.id,
      analyzed_at: analysis.created_at,
    });

    if (recentAnalyzedProjects.length === RECENT_ITEM_LIMIT) {
      break;
    }
  }

  return recentAnalyzedProjects;
}

function buildRecommendationRunSummary(
  row: DashboardRecommendationTopRow,
  projectById: Map<string, DashboardProjectRow>,
  employeeById: Map<string, DashboardEmployeeWorkloadRecord>
): DashboardRecommendationRunSummary {
  const project = projectById.get(row.project_id);
  const employee = employeeById.get(row.employee_id);
  const topCandidate: DashboardRecommendationTopCandidate = {
    employee_id: row.employee_id,
    employee_name: employee?.full_name ?? "",
    rank: row.rank,
    match_score: Number(row.match_score),
    confidence_score: Number(row.confidence_score),
    summary: row.summary,
  };

  return {
    project_id: row.project_id,
    project_title: project?.title ?? "",
    analysis_id: row.analysis_id,
    recommendation_run_id: row.recommendation_run_id,
    created_at: row.created_at,
    top_candidate: topCandidate,
  };
}

function buildProjectProgress(
  projects: DashboardProjectRow[],
  tasks: DashboardTaskRow[]
) {
  const taskCountsByProjectId = new Map<
    string,
    { completedTaskCount: number; totalTaskCount: number }
  >();

  for (const task of tasks) {
    const currentCounts = taskCountsByProjectId.get(task.project_id) ?? {
      completedTaskCount: 0,
      totalTaskCount: 0,
    };

    currentCounts.totalTaskCount += 1;

    if (task.status === "completed") {
      currentCounts.completedTaskCount += 1;
    }

    taskCountsByProjectId.set(task.project_id, currentCounts);
  }

  return projects
    .map<DashboardProjectProgressSummary>((project) => {
      const counts = taskCountsByProjectId.get(project.id) ?? {
        completedTaskCount: 0,
        totalTaskCount: 0,
      };
      const progressPercentage =
        counts.totalTaskCount === 0
          ? 0
          : Math.round((counts.completedTaskCount / counts.totalTaskCount) * 100);

      return {
        project_id: project.id,
        title: project.title,
        status: project.status,
        priority: project.priority,
        total_task_count: counts.totalTaskCount,
        completed_task_count: counts.completedTaskCount,
        progress_percentage: progressPercentage,
        updated_at: project.updated_at,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )
    .slice(0, RECENT_ITEM_LIMIT);
}

export async function getSupervisorDashboard(
  authUserId: string
): Promise<SupervisorDashboardResponse> {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"] satisfies readonly UserRole[]);

  const [
    projects,
    tasks,
    employees,
    documents,
    analyses,
    recommendationTopRows,
  ] = await Promise.all([
    listProjectsForDashboard(),
    listTasksForDashboard(),
    listEmployeesForDashboard(),
    listProjectDocumentsForDashboard(),
    listProjectAnalysesForDashboard(),
    listTopRecommendationRowsForDashboard(),
  ]);

  const projectById = buildProjectMap(projects);
  const employeeWorkloads = buildEmployeeWorkloadRecords(employees, tasks);
  const employeeById = buildEmployeeMap(employeeWorkloads);

  const projectStatusCounts = createProjectStatusCounts();
  const projectPriorityCounts = createPriorityCounts();

  for (const project of projects) {
    projectStatusCounts[project.status] += 1;
    projectPriorityCounts[project.priority] += 1;
  }

  const taskStatusCounts = createTaskStatusCounts();
  let unassignedTasks = 0;
  let assignedTasks = 0;

  for (const task of tasks) {
    taskStatusCounts[task.status] += 1;

    if (task.assigned_employee_id) {
      assignedTasks += 1;
    } else {
      unassignedTasks += 1;
    }
  }

  const totalEmployees = employeeWorkloads.length;
  const availableEmployees = employeeWorkloads.filter(
    (employee) => employee.availability_percentage > 0
  ).length;
  const highWorkloadEmployees = employeeWorkloads.filter(
    (employee) => employee.workload_percentage >= HIGH_WORKLOAD_THRESHOLD
  ).length;
  const averageWorkload =
    totalEmployees === 0
      ? 0
      : roundToTwoDecimals(
          employeeWorkloads.reduce(
            (total, employee) => total + employee.workload_percentage,
            0
          ) / totalEmployees
        );
  const averageAvailability =
    totalEmployees === 0
      ? 0
      : roundToTwoDecimals(
          employeeWorkloads.reduce(
            (total, employee) => total + employee.availability_percentage,
            0
          ) / totalEmployees
        );

  const documentStatusCounts = createDocumentStatusCounts();

  for (const document of documents) {
    documentStatusCounts[document.extraction_status] += 1;
  }

  const uniqueAnalyzedProjectIds = new Set(analyses.map((analysis) => analysis.project_id));
  const recentAnalyzedProjects = buildRecentAnalyzedProjects(analyses, projectById);

  const recentRecommendationRuns = recommendationTopRows
    .slice(0, RECENT_ITEM_LIMIT)
    .map((row) => buildRecommendationRunSummary(row, projectById, employeeById));
  const latestRecommendationRun = recentRecommendationRuns[0] ?? null;
  const latestTopRankedCandidate = latestRecommendationRun?.top_candidate ?? null;

  return {
    projects: {
      total_projects: projects.length,
      active_projects: projectStatusCounts.active,
      completed_projects: projectStatusCounts.completed,
      by_status: projectStatusCounts,
      by_priority: projectPriorityCounts,
      recently_updated_projects: [...projects]
        .sort(
          (left, right) =>
            new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
        )
        .slice(0, RECENT_ITEM_LIMIT),
    },
    tasks: {
      total_tasks: tasks.length,
      unassigned_tasks: unassignedTasks,
      assigned_tasks: assignedTasks,
      in_progress_tasks: taskStatusCounts.in_progress,
      blocked_tasks: taskStatusCounts.blocked,
      completed_tasks: taskStatusCounts.completed,
      by_status: taskStatusCounts,
      recent_tasks: [...tasks]
        .sort(
          (left, right) =>
            new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
        )
        .slice(0, RECENT_ITEM_LIMIT)
        .map((task) => ({
          id: task.id,
          project_id: task.project_id,
          project_title: projectById.get(task.project_id)?.title ?? "",
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigned_employee_id: task.assigned_employee_id,
          updated_at: task.updated_at,
        })),
    },
    employees: {
      total_employees: totalEmployees,
      available_employees: availableEmployees,
      high_workload_employees: highWorkloadEmployees,
      average_workload: averageWorkload,
      average_availability: averageAvailability,
      top_workloads: [...employeeWorkloads]
        .sort((left, right) => {
          const workloadDelta = right.workload_percentage - left.workload_percentage;

          if (workloadDelta !== 0) {
            return workloadDelta;
          }

          return left.full_name.localeCompare(right.full_name);
        })
        .slice(0, RECENT_ITEM_LIMIT),
    },
    documents: {
      total_uploaded_documents: documents.length,
      by_extraction_status: documentStatusCounts,
      projects_with_completed_analysis: uniqueAnalyzedProjectIds.size,
      recent_analyzed_projects: recentAnalyzedProjects,
    },
    recommendations: {
      projects_with_recommendation_runs: new Set(
        recommendationTopRows.map((row) => row.project_id)
      ).size,
      latest_recommendation_run: latestRecommendationRun,
      latest_top_ranked_candidate: latestTopRankedCandidate,
      recent_recommendation_runs: recentRecommendationRuns,
    },
    projectProgress: buildProjectProgress(projects, tasks),
  };
}
