import type {
  ProjectDocumentAnalysisInput,
  ProjectDocumentAnalysisResult,
} from "../types/ai.js";

const DEFAULT_ESTIMATED_HOURS = 8;

function inferSkills(text: string) {
  const lowerText = text.toLowerCase();
  const skillMatches = [
    ["api", "API Design"],
    ["database", "Database Design"],
    ["supabase", "Supabase"],
    ["auth", "Authentication"],
    ["typescript", "TypeScript"],
    ["react", "React"],
    ["report", "Reporting"],
    ["analytics", "Analytics"],
    ["upload", "File Uploads"],
  ] as const;

  return skillMatches
    .filter(([needle]) => lowerText.includes(needle))
    .map(([, skill]) => skill);
}

function inferComplexity(text: string): "low" | "medium" | "high" {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount > 1200) {
    return "high";
  }

  if (wordCount > 300) {
    return "medium";
  }

  return "low";
}

function inferEstimatedHours(text: string) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount === 0) {
    return DEFAULT_ESTIMATED_HOURS;
  }

  return Math.max(1, Math.min(80, Math.ceil(wordCount / 120)));
}

function summarize(text: string, fileName: string) {
  if (!text.trim()) {
    return `Analysis placeholder created for ${fileName}. Text extraction is pending for this document type.`;
  }

  const normalizedText = text.replace(/\s+/g, " ").trim();
  return normalizedText.length > 300
    ? `${normalizedText.slice(0, 297)}...`
    : normalizedText;
}

export async function analyzeProjectDocument(
  input: ProjectDocumentAnalysisInput
): Promise<ProjectDocumentAnalysisResult> {
  const requiredSkills = inferSkills(input.text);
  const complexity = inferComplexity(input.text);
  const estimatedHours = inferEstimatedHours(input.text);
  const summary = summarize(input.text, input.fileName);

  return {
    requiredSkills,
    complexity,
    estimatedHours,
    summary,
    provider: "placeholder",
    model: null,
    rawResult: {
      source: "local-placeholder",
      mimeType: input.mimeType,
      textLength: input.text.length,
    },
  };
}
