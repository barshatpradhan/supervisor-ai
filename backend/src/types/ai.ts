export type DocumentComplexity = "low" | "medium" | "high";

export interface ProjectDocumentAnalysisInput {
  text: string;
  mimeType: string;
}

export interface ProjectDocumentAnalysisResult {
  requiredSkills: string[];
  preferredSkills: string[];
  complexity: DocumentComplexity;
  estimatedHours: number;
  summary: string;
  suggestedRoles: string[];
  risks: string[];
  provider: "gemini";
  model: string | null;
  rawResult: Record<string, unknown>;
}

export interface EmployeeRecommendationScoreBreakdown {
  skillMatch: number;
  availability: number;
  performance: number;
  workload: number;
  requiredSkillMatch?: number;
  preferredSkillMatch?: number;
  proficiency?: number;
  experience?: number;
  workloadPercentage?: number;
  availabilityPercentage?: number;
  performanceScore?: number | null;
  estimatedProjectHours?: number;
  weeklyCapacityHours?: number;
  suitability?: EmployeeRecommendation["suitability"];
  reasons?: string[];
  matchedRequiredSkills?: string[];
  matchedPreferredSkills?: string[];
  missingRequiredSkills?: string[];
  missingPreferredSkills?: string[];
}

export type EmployeeRecommendation = {
  employeeId: string;
  fullName: string;
  score: number;
  rank: number;
  matchedRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  workloadPercentage: number;
  availabilityPercentage: number;
  performanceScore: number | null;
  estimatedProjectHours: number;
  weeklyCapacityHours: number;
  suitability: "strong" | "moderate" | "weak";
  reasons: string[];
};

// Compatibility fields are retained while frontend consumers transition to
// the recommendation contract above.
export interface EmployeeRecommendationResult extends EmployeeRecommendation {
  employeeName: string;
  matchScore: number;
  confidenceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  scoreBreakdown: EmployeeRecommendationScoreBreakdown;
  summary: string;
}

export interface AssignRecommendedEmployeeInput {
  recommendationRunId: string;
  employeeId: string;
  taskId?: string;
  task?: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    estimatedHours: number;
    dueDate?: string;
  };
}
