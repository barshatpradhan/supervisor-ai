export type DocumentComplexity = "low" | "medium" | "high";

export interface ProjectDocumentAnalysisInput {
  text: string;
  fileName: string;
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
  provider: "placeholder" | "gemini";
  model: string | null;
  rawResult: Record<string, unknown>;
}

export interface EmployeeRecommendationScoreBreakdown {
  skillMatch: number;
  availability: number;
  performance: number;
  workload: number;
}

export interface EmployeeRecommendationResult {
  employeeId: string;
  employeeName: string;
  rank: number;
  matchScore: number;
  confidenceScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  scoreBreakdown: EmployeeRecommendationScoreBreakdown;
  summary: string;
}
