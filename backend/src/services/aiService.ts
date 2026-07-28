import type { ProjectDocumentAnalysisInput, ProjectDocumentAnalysisResult } from "../types/ai.js";
import { analyzeWithGemini } from "./ai/gemini.service.js";

export function analyzeProjectDocument(input: ProjectDocumentAnalysisInput): Promise<ProjectDocumentAnalysisResult> {
  return analyzeWithGemini(input);
}
