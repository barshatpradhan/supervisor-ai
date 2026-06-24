import type {
  DocumentComplexity,
  ProjectDocumentAnalysisInput,
  ProjectDocumentAnalysisResult,
} from "../types/ai.js";

const DEFAULT_ESTIMATED_HOURS = 8;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_ANALYSIS_TEXT_LENGTH = 24000;
const COMPLEXITIES: readonly DocumentComplexity[] = ["low", "medium", "high"];

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function uniqueCleanStrings(values: unknown, limit: number) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleaned.push(normalized.slice(0, 120));

    if (cleaned.length >= limit) {
      break;
    }
  }

  return cleaned;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function cleanComplexity(value: unknown, fallback: DocumentComplexity) {
  return typeof value === "string" &&
    COMPLEXITIES.includes(value as DocumentComplexity)
    ? (value as DocumentComplexity)
    : fallback;
}

function cleanEstimatedHours(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.min(1000, Math.round(numericValue * 4) / 4));
}

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
    ["document", "Document Processing"],
  ] as const;

  return skillMatches
    .filter(([needle]) => lowerText.includes(needle))
    .map(([, skill]) => skill);
}

function inferComplexity(text: string): DocumentComplexity {
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
  return normalizedText.length > 500
    ? `${normalizedText.slice(0, 497)}...`
    : normalizedText;
}

function createFallbackAnalysis(
  input: ProjectDocumentAnalysisInput,
  reason: string
): ProjectDocumentAnalysisResult {
  const requiredSkills = inferSkills(input.text);
  const complexity = inferComplexity(input.text);
  const estimatedHours = inferEstimatedHours(input.text);
  const summary = summarize(input.text, input.fileName);

  return {
    requiredSkills,
    preferredSkills: [],
    complexity,
    estimatedHours,
    summary,
    suggestedRoles: requiredSkills.length > 0 ? ["Backend Engineer"] : [],
    risks: input.text.trim() ? [] : ["Text extraction is pending or empty."],
    provider: "placeholder",
    model: null,
    rawResult: {
      source: "local-fallback",
      reason,
      mimeType: input.mimeType,
      textLength: input.text.length,
    },
  };
}

function buildGeminiPrompt(input: ProjectDocumentAnalysisInput) {
  const analysisText = input.text.slice(0, MAX_ANALYSIS_TEXT_LENGTH);

  return `Analyze this project document for staffing and planning.

Return only valid JSON with this exact shape:
{
  "summary": "string",
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "complexity": "low" | "medium" | "high",
  "estimatedHours": number,
  "suggestedRoles": ["string"],
  "risks": ["string"]
}

Rules:
- Use concise, professional wording.
- requiredSkills must include only skills that are clearly needed.
- preferredSkills must include useful but non-blocking skills.
- estimatedHours must be realistic implementation effort.
- Do not include private personal data.

File name: ${input.fileName}
MIME type: ${input.mimeType}

Document text:
${analysisText}`;
}

function parseGeminiJson(response: GeminiGenerateContentResponse) {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function normalizeGeminiAnalysis(
  input: ProjectDocumentAnalysisInput,
  raw: Record<string, unknown>
): ProjectDocumentAnalysisResult {
  const fallbackComplexity = inferComplexity(input.text);
  const fallbackEstimatedHours = inferEstimatedHours(input.text);

  return {
    requiredSkills: uniqueCleanStrings(raw.requiredSkills, 20),
    preferredSkills: uniqueCleanStrings(raw.preferredSkills, 20),
    complexity: cleanComplexity(raw.complexity, fallbackComplexity),
    estimatedHours: cleanEstimatedHours(raw.estimatedHours, fallbackEstimatedHours),
    summary: cleanText(raw.summary, summarize(input.text, input.fileName), 1000),
    suggestedRoles: uniqueCleanStrings(raw.suggestedRoles, 12),
    risks: uniqueCleanStrings(raw.risks, 12),
    provider: "gemini",
    model: GEMINI_MODEL,
    rawResult: {
      source: "gemini",
      result: raw,
    },
  };
}

async function analyzeWithGemini(
  input: ProjectDocumentAnalysisInput
): Promise<ProjectDocumentAnalysisResult | null> {
  if (!GEMINI_API_KEY || !input.text.trim()) {
    return null;
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildGeminiPrompt(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as GeminiGenerateContentResponse;
  const raw = parseGeminiJson(body);

  return raw ? normalizeGeminiAnalysis(input, raw) : null;
}

export async function analyzeProjectDocument(
  input: ProjectDocumentAnalysisInput
): Promise<ProjectDocumentAnalysisResult> {
  try {
    const geminiResult = await analyzeWithGemini(input);

    if (geminiResult) {
      return geminiResult;
    }

    return createFallbackAnalysis(input, "gemini-unavailable");
  } catch {
    return createFallbackAnalysis(input, "gemini-failed");
  }
}
