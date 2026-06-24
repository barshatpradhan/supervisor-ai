import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";
import type {
  EmployeeRecommendationResult,
  EmployeeRecommendationScoreBreakdown,
} from "../types/ai.js";
import { AppError } from "../utils/appError.js";
import { assertRole, getAppUserByAuthId } from "./userService.js";

interface ProjectRow {
  id: string;
  required_skills: string[] | null;
}

interface AnalysisRow {
  id: string;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  complexity: "low" | "medium" | "high";
  estimated_hours: number;
  summary: string;
  created_at: string;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  availability_percentage: number | null;
  workload_percentage: number | null;
  performance_score: number | null;
  weekly_capacity_hours: number | null;
  employment_type: string | null;
}

interface EmployeeSkillRow {
  employee_id: string;
  skill_id: string;
  proficiency_level: number | null;
  years_of_experience: number | null;
}

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string | null;
  is_approved: boolean;
}

interface RecommendationRow {
  id: string;
  project_id: string;
  analysis_id: string | null;
  recommendation_run_id: string;
  employee_id: string;
  rank: number;
  match_score: number;
  confidence_score: number;
  matched_skills: string[];
  missing_skills: string[];
  score_breakdown: EmployeeRecommendationScoreBreakdown;
  summary: string;
  created_at: string;
}

interface RecommendationResponse {
  projectId: string;
  analysisId: string | null;
  recommendationRunId: string;
  recommendations: EmployeeRecommendationResult[];
}

function normalizeSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const cleaned = skill.replace(/\s+/g, " ").trim();
    const normalized = normalizeSkill(cleaned);

    if (!cleaned || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(cleaned);
  }

  return result;
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizePerformanceScore(value: number | null) {
  const score = Number(value);

  if (!Number.isFinite(score) || score <= 0) {
    return 50;
  }

  return clampPercentage(score);
}

function isSkillMatch(requiredSkill: string, employeeSkills: Set<string>) {
  const normalizedRequiredSkill = normalizeSkill(requiredSkill);

  for (const employeeSkill of employeeSkills) {
    if (
      employeeSkill === normalizedRequiredSkill ||
      employeeSkill.includes(normalizedRequiredSkill) ||
      normalizedRequiredSkill.includes(employeeSkill)
    ) {
      return true;
    }
  }

  return false;
}

function scoreEmployee(
  employee: EmployeeRow,
  employeeSkills: string[],
  targetSkills: string[]
): EmployeeRecommendationResult {
  const normalizedEmployeeSkills = new Set(employeeSkills.map(normalizeSkill));
  const matchedSkills = targetSkills.filter((skill) =>
    isSkillMatch(skill, normalizedEmployeeSkills)
  );
  const missingSkills = targetSkills.filter(
    (skill) => !isSkillMatch(skill, normalizedEmployeeSkills)
  );
  const skillMatchScore =
    targetSkills.length === 0
      ? 100
      : (matchedSkills.length / targetSkills.length) * 100;
  const availabilityScore = clampPercentage(
    Number(employee.availability_percentage ?? 0)
  );
  const performanceScore = normalizePerformanceScore(employee.performance_score);
  const workloadScore = clampPercentage(
    100 - Number(employee.workload_percentage ?? 100)
  );
  const matchScore =
    skillMatchScore * 0.5 +
    availabilityScore * 0.25 +
    performanceScore * 0.15 +
    workloadScore * 0.1;
  const confidenceScore =
    targetSkills.length === 0
      ? 50
      : Math.min(95, 60 + (matchedSkills.length / targetSkills.length) * 35);

  return {
    employeeId: employee.id,
    employeeName: employee.full_name,
    rank: 0,
    matchScore: roundScore(matchScore),
    confidenceScore: roundScore(confidenceScore),
    matchedSkills,
    missingSkills,
    scoreBreakdown: {
      skillMatch: roundScore(skillMatchScore),
      availability: roundScore(availabilityScore),
      performance: roundScore(performanceScore),
      workload: roundScore(workloadScore),
    },
    summary:
      missingSkills.length === 0
        ? `${employee.full_name} matches the identified project skills.`
        : `${employee.full_name} matches ${matchedSkills.length} of ${targetSkills.length} identified project skills.`,
  };
}

async function ensureProjectExists(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, required_skills")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single<ProjectRow>();

  if (error || !data) {
    throw new AppError("Project not found.", 404);
  }

  return data;
}

async function getLatestAnalysis(projectId: string) {
  const { data, error } = await supabase
    .from("project_document_analyses")
    .select(
      "id, required_skills, preferred_skills, complexity, estimated_hours, summary, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AnalysisRow>();

  if (error) {
    throw new AppError("Unable to fetch latest project analysis.", 500);
  }

  return data;
}

async function getEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, availability_percentage, workload_percentage, performance_score, weekly_capacity_hours, employment_type"
    )
    .returns<EmployeeRow[]>();

  if (error) {
    throw new AppError("Unable to fetch employees.", 500);
  }

  return data ?? [];
}

async function getEmployeeSkills() {
  const { data: employeeSkills, error: employeeSkillsError } = await supabase
    .from("employee_skills")
    .select("employee_id, skill_id, proficiency_level, years_of_experience")
    .returns<EmployeeSkillRow[]>();

  if (employeeSkillsError) {
    throw new AppError("Unable to fetch employee skills.", 500);
  }

  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("id, name, normalized_name, is_approved")
    .eq("is_approved", true)
    .returns<SkillRow[]>();

  if (skillsError) {
    throw new AppError("Unable to fetch skills.", 500);
  }

  const skillNameById = new Map(
    (skills ?? []).map((skill) => [
      skill.id,
      skill.normalized_name || skill.name,
    ])
  );
  const skillsByEmployeeId = new Map<string, string[]>();

  for (const employeeSkill of employeeSkills ?? []) {
    const skillName = skillNameById.get(employeeSkill.skill_id);

    if (!skillName) {
      continue;
    }

    const currentSkills = skillsByEmployeeId.get(employeeSkill.employee_id) ?? [];
    currentSkills.push(skillName);
    skillsByEmployeeId.set(employeeSkill.employee_id, currentSkills);
  }

  return skillsByEmployeeId;
}

function mapRecommendationRows(
  rows: RecommendationRow[],
  employeeNameById: Map<string, string>
): RecommendationResponse {
  const firstRow = rows[0];

  return {
    projectId: firstRow?.project_id ?? "",
    analysisId: firstRow?.analysis_id ?? null,
    recommendationRunId: firstRow?.recommendation_run_id ?? "",
    recommendations: rows.map((row) => ({
      employeeId: row.employee_id,
      employeeName: employeeNameById.get(row.employee_id) ?? "",
      rank: row.rank,
      matchScore: Number(row.match_score),
      confidenceScore: Number(row.confidence_score),
      matchedSkills: row.matched_skills,
      missingSkills: row.missing_skills,
      scoreBreakdown: row.score_breakdown,
      summary: row.summary,
    })),
  };
}

export async function generateProjectRecommendations(
  authUserId: string,
  projectId: string
): Promise<RecommendationResponse> {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);
  const project = await ensureProjectExists(projectId);
  const latestAnalysis = await getLatestAnalysis(projectId);

  if (!latestAnalysis) {
    throw new AppError("Project document analysis is required before recommendations.", 400);
  }

  const targetSkills = uniqueSkills([
    ...(latestAnalysis.required_skills ?? []),
    ...((latestAnalysis.required_skills ?? []).length === 0
      ? project.required_skills ?? []
      : []),
  ]);
  const employees = await getEmployees();
  const skillsByEmployeeId = await getEmployeeSkills();
  const recommendationRunId = crypto.randomUUID();
  const recommendations = employees
    .map((employee) =>
      scoreEmployee(
        employee,
        skillsByEmployeeId.get(employee.id) ?? [],
        targetSkills
      )
    )
    .sort((left, right) => right.matchScore - left.matchScore)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }));

  if (recommendations.length === 0) {
    throw new AppError("No employees are available for recommendation.", 400);
  }

  const rowsToInsert = recommendations.map((recommendation) => ({
    project_id: projectId,
    analysis_id: latestAnalysis.id,
    recommendation_run_id: recommendationRunId,
    employee_id: recommendation.employeeId,
    generated_by_user_id: appUser.id,
    rank: recommendation.rank,
    match_score: recommendation.matchScore,
    confidence_score: recommendation.confidenceScore,
    matched_skills: recommendation.matchedSkills,
    missing_skills: recommendation.missingSkills,
    score_breakdown: recommendation.scoreBreakdown,
    summary: recommendation.summary,
  }));

  const { error } = await supabase.from("ai_recommendations").insert(rowsToInsert);

  if (error) {
    throw new AppError("Unable to save project recommendations.", 500);
  }

  return {
    projectId,
    analysisId: latestAnalysis.id,
    recommendationRunId,
    recommendations,
  };
}

export async function getLatestProjectRecommendations(
  authUserId: string,
  projectId: string
): Promise<RecommendationResponse> {
  const appUser = await getAppUserByAuthId(authUserId);
  assertRole(appUser, ["admin", "supervisor"]);
  await ensureProjectExists(projectId);

  const { data: latestRow, error: latestRowError } = await supabase
    .from("ai_recommendations")
    .select("recommendation_run_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ recommendation_run_id: string }>();

  if (latestRowError) {
    throw new AppError("Unable to fetch latest recommendations.", 500);
  }

  if (!latestRow) {
    throw new AppError("No recommendations found for this project.", 404);
  }

  const { data, error } = await supabase
    .from("ai_recommendations")
    .select(
      "id, project_id, analysis_id, recommendation_run_id, employee_id, rank, match_score, confidence_score, matched_skills, missing_skills, score_breakdown, summary, created_at"
    )
    .eq("project_id", projectId)
    .eq("recommendation_run_id", latestRow.recommendation_run_id)
    .order("rank", { ascending: true })
    .returns<RecommendationRow[]>();

  if (error) {
    throw new AppError("Unable to fetch recommendations.", 500);
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    throw new AppError("No recommendations found for this project.", 404);
  }

  const employeeIds = rows.map((row) => row.employee_id);
  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name")
    .in("id", employeeIds)
    .returns<Array<{ id: string; full_name: string }>>();

  if (employeeError) {
    throw new AppError("Unable to fetch recommendation employees.", 500);
  }

  const employeeNameById = new Map(
    (employees ?? []).map((employee) => [employee.id, employee.full_name])
  );

  return mapRecommendationRows(rows, employeeNameById);
}
