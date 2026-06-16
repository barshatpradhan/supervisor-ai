export type DocumentComplexity = "low" | "medium" | "high";

export interface ProjectDocumentAnalysisInput {
  text: string;
  fileName: string;
  mimeType: string;
}

export interface ProjectDocumentAnalysisResult {
  requiredSkills: string[];
  complexity: DocumentComplexity;
  estimatedHours: number;
  summary: string;
  provider: "placeholder" | "gemini";
  model: string | null;
  rawResult: Record<string, unknown>;
}
