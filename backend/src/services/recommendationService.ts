import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";
import type {
  EmployeeRecommendationResult,
  EmployeeRecommendationScoreBreakdown,
} from "../types/ai.js";
import { AppError } from "../utils/appError.js";
import { enrichEmployeesWithCapacityMetrics } from "./employeeMetricsService.js";
import { ensureProjectExistsInOrganization } from "./projectService.js";
import { getAppUserByAuthId } from "./userService.js";

interface AnalysisRow {
  id: string;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  estimated_hours: number;
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

interface EmployeeSkillLinkRow {
  employee_id: string;
  skill_id: string;
  proficiency_level: number | null;
  years_of_experience: number | null;
}

interface SkillRow {
  id: string;
  name: string;
  normalized_name: string | null;
}

interface EmployeeSkill {
  name: string;
  proficiencyLevel: number | null;
  yearsOfExperience: number | null;
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

const SCORE_WEIGHTS = {
  requiredSkills: 50,
  preferredSkills: 15,
  availability: 15,
  performance: 10,
  proficiency: 5,
  experience: 5,
} as const;

function normalizeSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const cleaned = skill.replace(/\s+/g, " ").trim();
    const normalized = normalizeSkill(cleaned);
    if (!cleaned || seen.has(normalized)) continue;
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

function numericValue(value: number | null | undefined, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function findMatchingSkill(targetSkill: string, employeeSkills: EmployeeSkill[]) {
  const normalizedTarget = normalizeSkill(targetSkill);
  return employeeSkills.find((skill) => {
    const normalizedEmployeeSkill = normalizeSkill(skill.name);
    return (
      normalizedEmployeeSkill === normalizedTarget ||
      normalizedEmployeeSkill.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedEmployeeSkill)
    );
  });
}

function splitSkillMatches(targetSkills: string[], employeeSkills: EmployeeSkill[]) {
  const matched: string[] = [];
  const missing: string[] = [];
  const matchedEmployeeSkills: EmployeeSkill[] = [];

  for (const targetSkill of targetSkills) {
    const match = findMatchingSkill(targetSkill, employeeSkills);
    if (match) {
      matched.push(targetSkill);
      matchedEmployeeSkills.push(match);
    } else {
      missing.push(targetSkill);
    }
  }

  return { matched, missing, matchedEmployeeSkills };
}

function scorePercentage(matched: number, total: number) {
  return total === 0 ? null : (matched / total) * 100;
}

function weightedScore(components: Array<{ score: number | null; weight: number }>) {
  const eligible = components.filter((component) => component.score !== null);
  const totalWeight = eligible.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight === 0) return 0;
  return eligible.reduce((sum, component) => sum + (component.score! * component.weight) / totalWeight, 0);
}

function determineSuitability(score: number, missingRequiredSkills: string[]) {
  if (score >= 75 && missingRequiredSkills.length === 0) return "strong" as const;
  if (score >= 50) return "moderate" as const;
  return "weak" as const;
}

function buildReasons(input: {
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  workloadPercentage: number;
  availabilityPercentage: number;
  performanceScore: number | null;
}) {
  const reasons: string[] = [];
  if (input.matchedRequiredSkills.length > 0) {
    reasons.push(`Matches ${input.matchedRequiredSkills.length} required project skill${input.matchedRequiredSkills.length === 1 ? "" : "s"}.`);
  }
  if (input.missingRequiredSkills.length > 0) {
    reasons.push(`Missing required skills: ${input.missingRequiredSkills.join(", ")}.`);
  }
  if (input.matchedPreferredSkills.length > 0) {
    reasons.push(`Matches ${input.matchedPreferredSkills.length} preferred project skill${input.matchedPreferredSkills.length === 1 ? "" : "s"}.`);
  }
  reasons.push(`Current workload is ${roundScore(input.workloadPercentage)}% with ${roundScore(input.availabilityPercentage)}% availability.`);
  if (input.performanceScore !== null) {
    reasons.push(`Performance score is ${roundScore(input.performanceScore)}%.`);
  }
  return reasons.slice(0, 5);
}

function scoreEmployee(
  employee: EmployeeRow,
  employeeSkills: EmployeeSkill[],
  analysis: AnalysisRow
): EmployeeRecommendationResult {
  const requiredSkills = uniqueSkills(analysis.required_skills ?? []);
  const requiredSkillNames = new Set(requiredSkills.map(normalizeSkill));
  const preferredSkills = uniqueSkills(analysis.preferred_skills ?? []).filter(
    (skill) => !requiredSkillNames.has(normalizeSkill(skill))
  );
  const required = splitSkillMatches(requiredSkills, employeeSkills);
  const preferred = splitSkillMatches(preferredSkills, employeeSkills);
  const matchedEmployeeSkills = [...required.matchedEmployeeSkills, ...preferred.matchedEmployeeSkills];
  const workloadPercentage = clampPercentage(numericValue(employee.workload_percentage, 100));
  const availabilityPercentage = clampPercentage(numericValue(employee.availability_percentage, 0));
  const performanceScore = employee.performance_score === null ? null : clampPercentage(numericValue(employee.performance_score, 50));
  const proficiencyScore = matchedEmployeeSkills.length === 0
    ? 0
    : (matchedEmployeeSkills.reduce((sum, skill) => sum + clampPercentage(numericValue(skill.proficiencyLevel, 3) * 20), 0) / matchedEmployeeSkills.length);
  const experienceScore = matchedEmployeeSkills.length === 0
    ? 0
    : (matchedEmployeeSkills.reduce((sum, skill) => sum + clampPercentage(numericValue(skill.yearsOfExperience, 0) * 10), 0) / matchedEmployeeSkills.length);
  const requiredSkillMatch = scorePercentage(required.matched.length, requiredSkills.length);
  const preferredSkillMatch = scorePercentage(preferred.matched.length, preferredSkills.length);
  const score = roundScore(weightedScore([
    { score: requiredSkillMatch, weight: SCORE_WEIGHTS.requiredSkills },
    { score: preferredSkillMatch, weight: SCORE_WEIGHTS.preferredSkills },
    { score: availabilityPercentage, weight: SCORE_WEIGHTS.availability },
    { score: performanceScore, weight: SCORE_WEIGHTS.performance },
    { score: matchedEmployeeSkills.length > 0 ? proficiencyScore : null, weight: SCORE_WEIGHTS.proficiency },
    { score: matchedEmployeeSkills.length > 0 ? experienceScore : null, weight: SCORE_WEIGHTS.experience },
  ]));
  const suitability = determineSuitability(score, required.missing);
  const estimatedProjectHours = Math.max(0, numericValue(analysis.estimated_hours, 0));
  const weeklyCapacityHours = Math.max(0, numericValue(employee.weekly_capacity_hours, 0));
  const reasons = buildReasons({
    matchedRequiredSkills: required.matched,
    missingRequiredSkills: required.missing,
    matchedPreferredSkills: preferred.matched,
    workloadPercentage,
    availabilityPercentage,
    performanceScore,
  });
  const scoreBreakdown: EmployeeRecommendationScoreBreakdown = {
    skillMatch: roundScore(((requiredSkillMatch ?? 0) + (preferredSkillMatch ?? 0)) / ((requiredSkillMatch !== null ? 1 : 0) + (preferredSkillMatch !== null ? 1 : 0) || 1)),
    availability: roundScore(availabilityPercentage),
    performance: roundScore(performanceScore ?? 50),
    workload: roundScore(100 - workloadPercentage),
    requiredSkillMatch: requiredSkillMatch ?? 0,
    preferredSkillMatch: preferredSkillMatch ?? 0,
    proficiency: roundScore(proficiencyScore),
    experience: roundScore(experienceScore),
    workloadPercentage: roundScore(workloadPercentage),
    availabilityPercentage: roundScore(availabilityPercentage),
    performanceScore: performanceScore === null ? null : roundScore(performanceScore),
    estimatedProjectHours: roundScore(estimatedProjectHours),
    weeklyCapacityHours: roundScore(weeklyCapacityHours),
    suitability,
    reasons,
    matchedRequiredSkills: required.matched,
    matchedPreferredSkills: preferred.matched,
    missingRequiredSkills: required.missing,
    missingPreferredSkills: preferred.missing,
  };
  const matchedSkills = [...required.matched, ...preferred.matched];
  const missingSkills = [...required.missing, ...preferred.missing];

  return {
    employeeId: employee.id,
    fullName: employee.full_name,
    score,
    rank: 0,
    matchedRequiredSkills: required.matched,
    matchedPreferredSkills: preferred.matched,
    missingRequiredSkills: required.missing,
    missingPreferredSkills: preferred.missing,
    workloadPercentage: roundScore(workloadPercentage),
    availabilityPercentage: roundScore(availabilityPercentage),
    performanceScore: performanceScore === null ? null : roundScore(performanceScore),
    estimatedProjectHours: roundScore(estimatedProjectHours),
    weeklyCapacityHours: roundScore(weeklyCapacityHours),
    suitability,
    reasons,
    employeeName: employee.full_name,
    matchScore: score,
    confidenceScore: roundScore(Math.min(95, 55 + (requiredSkillMatch ?? preferredSkillMatch ?? 0) * 0.4)),
    matchedSkills,
    missingSkills,
    scoreBreakdown,
    summary: reasons.join(" "),
  };
}

async function getLatestAnalysis(projectId: string) {
  const { data, error } = await supabase
    .from("project_document_analyses")
    .select("id, required_skills, preferred_skills, estimated_hours, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AnalysisRow>();
  if (error) throw new AppError("Unable to fetch latest project analysis.", 500);
  return data;
}

async function getEmployees(organizationId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, availability_percentage, workload_percentage, performance_score, weekly_capacity_hours, employment_type")
    .eq("organization_id", organizationId)
    .returns<EmployeeRow[]>();
  if (error) throw new AppError("Unable to fetch employees.", 500);
  return enrichEmployeesWithCapacityMetrics(data ?? []);
}

async function getEmployeeSkills(employeeIds: string[]) {
  const skillsByEmployeeId = new Map<string, EmployeeSkill[]>();
  for (const employeeId of employeeIds) skillsByEmployeeId.set(employeeId, []);
  if (employeeIds.length === 0) return skillsByEmployeeId;

  const { data: links, error: linksError } = await supabase
    .from("employee_skills")
    .select("employee_id, skill_id, proficiency_level, years_of_experience")
    .in("employee_id", employeeIds)
    .returns<EmployeeSkillLinkRow[]>();
  if (linksError) throw new AppError("Unable to fetch employee skills.", 500);

  const skillIds = [...new Set((links ?? []).map((link) => link.skill_id))];
  if (skillIds.length === 0) return skillsByEmployeeId;
  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("id, name, normalized_name")
    .eq("is_approved", true)
    .in("id", skillIds)
    .returns<SkillRow[]>();
  if (skillsError) throw new AppError("Unable to fetch skills.", 500);

  const skillById = new Map((skills ?? []).map((skill) => [skill.id, skill]));
  for (const link of links ?? []) {
    const skill = skillById.get(link.skill_id);
    if (!skill) continue;
    skillsByEmployeeId.get(link.employee_id)?.push({
      name: skill.normalized_name || skill.name,
      proficiencyLevel: link.proficiency_level,
      yearsOfExperience: link.years_of_experience,
    });
  }
  return skillsByEmployeeId;
}

function mapRecommendationRows(rows: RecommendationRow[], employeeNameById: Map<string, string>): RecommendationResponse {
  const firstRow = rows[0];
  return {
    projectId: firstRow?.project_id ?? "",
    analysisId: firstRow?.analysis_id ?? null,
    recommendationRunId: firstRow?.recommendation_run_id ?? "",
    recommendations: rows.map((row) => {
      const details = row.score_breakdown;
      const matchedRequiredSkills = details.matchedRequiredSkills ?? row.matched_skills;
      const matchedPreferredSkills = details.matchedPreferredSkills ?? [];
      const missingRequiredSkills = details.missingRequiredSkills ?? row.missing_skills;
      const missingPreferredSkills = details.missingPreferredSkills ?? [];
      const score = Number(row.match_score);
      const workloadPercentage = details.workloadPercentage ?? Math.max(0, 100 - Number(details.workload ?? 0));
      const availabilityPercentage = details.availabilityPercentage ?? Number(details.availability ?? 0);
      const suitability = details.suitability ?? determineSuitability(score, missingRequiredSkills);
      const reasons = details.reasons ?? [row.summary];
      const fullName = employeeNameById.get(row.employee_id) ?? "";
      return {
        employeeId: row.employee_id,
        fullName,
        score,
        rank: row.rank,
        matchedRequiredSkills,
        matchedPreferredSkills,
        missingRequiredSkills,
        missingPreferredSkills,
        workloadPercentage: roundScore(workloadPercentage),
        availabilityPercentage: roundScore(availabilityPercentage),
        performanceScore: details.performanceScore ?? null,
        estimatedProjectHours: details.estimatedProjectHours ?? 0,
        weeklyCapacityHours: details.weeklyCapacityHours ?? 0,
        suitability,
        reasons,
        employeeName: fullName,
        matchScore: score,
        confidenceScore: Number(row.confidence_score),
        matchedSkills: row.matched_skills,
        missingSkills: row.missing_skills,
        scoreBreakdown: details,
        summary: row.summary,
      };
    }),
  };
}

export async function generateProjectRecommendations(authUserId: string, organizationId: string, projectId: string): Promise<RecommendationResponse> {
  const startedAt = Date.now();
  const appUser = await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);
  const latestAnalysis = await getLatestAnalysis(projectId);
  if (!latestAnalysis) throw new AppError("Project document analysis is required before recommendations.", 400);

  console.info(JSON.stringify({ scope: "recommendations", event: "generation_started", projectId }));
  const employees = await getEmployees(organizationId);
  if (employees.length === 0) throw new AppError("No employees are available for recommendation.", 400);
  const skillsByEmployeeId = await getEmployeeSkills(employees.map((employee) => employee.id));
  const recommendationRunId = crypto.randomUUID();
  const recommendations = employees
    .map((employee) => scoreEmployee(employee, skillsByEmployeeId.get(employee.id) ?? [], latestAnalysis))
    .sort((left, right) => right.score - left.score || left.fullName.localeCompare(right.fullName))
    .map((recommendation, index) => ({ ...recommendation, rank: index + 1 }));
  const rowsToInsert = recommendations.map((recommendation) => ({
    project_id: projectId,
    analysis_id: latestAnalysis.id,
    recommendation_run_id: recommendationRunId,
    employee_id: recommendation.employeeId,
    generated_by_user_id: appUser.id,
    rank: recommendation.rank,
    match_score: recommendation.score,
    confidence_score: recommendation.confidenceScore,
    matched_skills: recommendation.matchedSkills,
    missing_skills: recommendation.missingSkills,
    score_breakdown: recommendation.scoreBreakdown,
    summary: recommendation.summary,
  }));
  const { error } = await supabase.from("ai_recommendations").insert(rowsToInsert);
  if (error) throw new AppError("Unable to save project recommendations.", 500);
  console.info(JSON.stringify({ scope: "recommendations", event: "generation_saved", projectId, recommendationRunId, count: recommendations.length, durationMs: Date.now() - startedAt }));
  return { projectId, analysisId: latestAnalysis.id, recommendationRunId, recommendations };
}

export async function getLatestProjectRecommendations(authUserId: string, organizationId: string, projectId: string): Promise<RecommendationResponse> {
  await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);
  const { data: latestRow, error: latestRowError } = await supabase
    .from("ai_recommendations").select("recommendation_run_id").eq("project_id", projectId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle<{ recommendation_run_id: string }>();
  if (latestRowError) throw new AppError("Unable to fetch latest recommendations.", 500);
  if (!latestRow) throw new AppError("No recommendations found for this project.", 404);
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("id, project_id, analysis_id, recommendation_run_id, employee_id, rank, match_score, confidence_score, matched_skills, missing_skills, score_breakdown, summary, created_at")
    .eq("project_id", projectId).eq("recommendation_run_id", latestRow.recommendation_run_id)
    .order("rank", { ascending: true }).returns<RecommendationRow[]>();
  if (error) throw new AppError("Unable to fetch recommendations.", 500);
  const rows = data ?? [];
  if (rows.length === 0) throw new AppError("No recommendations found for this project.", 404);
  const employeeIds = rows.map((row) => row.employee_id);
  const { data: employees, error: employeeError } = await supabase
    .from("employees").select("id, full_name").eq("organization_id", organizationId).in("id", employeeIds)
    .returns<Array<{ id: string; full_name: string }>>();
  if (employeeError) throw new AppError("Unable to fetch recommendation employees.", 500);
  return mapRecommendationRows(rows, new Map((employees ?? []).map((employee) => [employee.id, employee.full_name])));
}
