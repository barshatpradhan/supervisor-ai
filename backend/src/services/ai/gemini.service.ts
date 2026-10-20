import { GoogleGenAI } from "@google/genai";
import type { DocumentComplexity, ProjectDocumentAnalysisInput, ProjectDocumentAnalysisResult } from "../../types/ai.js";
import { AppError } from "../../utils/appError.js";
import { buildProjectDocumentAnalysisPrompt } from "./promptBuilder.js";
import { incrementMetric } from "../../middleware/observabilityMiddleware.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const COMPLEXITIES: readonly DocumentComplexity[] = ["low", "medium", "high"];
const MAX_ATTEMPTS = 3;
// Waits before attempts 2 and 3 when Gemini is rate limited or overloaded (429/5xx).
const RETRY_DELAYS_MS = [2_000, 6_000];

function getErrorStatus(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function isTransientStatus(status: number | undefined) {
  return status === 429 || (status !== undefined && status >= 500);
}

function getGeminiConfiguration() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError("Gemini analysis is not configured.", 503, true);
  }

  return {
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
  };
}

function normalizeStringList(value: unknown, limit: number) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError("Gemini returned an invalid analysis response.", 502, true);
  }

  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of value) {
    const normalized = item.replace(/\s+/g, " ").trim();
    const key = normalized.toLocaleLowerCase();
    if (normalized && !seen.has(key)) {
      seen.add(key);
      values.push(normalized.slice(0, 120));
    }
    if (values.length === limit) break;
  }
  return values;
}

function normalizeResponse(value: unknown, model: string): ProjectDocumentAnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("Gemini returned an invalid analysis response.", 502, true);
  }
  const raw = value as Record<string, unknown>;
  const complexity = raw.complexity;
  const estimatedHours = raw.estimatedHours;
  const summary = typeof raw.summary === "string" ? raw.summary.replace(/\s+/g, " ").trim() : "";

  if (
    !COMPLEXITIES.includes(complexity as DocumentComplexity) ||
    typeof estimatedHours !== "number" ||
    !Number.isFinite(estimatedHours) ||
    estimatedHours <= 0 ||
    !summary
  ) {
    throw new AppError("Gemini returned an invalid analysis response.", 502, true);
  }

  const normalized = {
    summary: summary.slice(0, 4000),
    complexity: complexity as DocumentComplexity,
    estimatedHours: Math.min(10000, Math.round(estimatedHours * 4) / 4),
    requiredSkills: normalizeStringList(raw.requiredSkills, 30),
    preferredSkills: normalizeStringList(raw.preferredSkills, 30),
    suggestedRoles: normalizeStringList(raw.suggestedRoles, 20),
    risks: normalizeStringList(raw.risks, 20),
  };

  return {
    ...normalized,
    provider: "gemini",
    model,
    rawResult: { source: "gemini", response: normalized },
  };
}

export async function analyzeWithGemini(input: ProjectDocumentAnalysisInput): Promise<ProjectDocumentAnalysisResult> {
  const startedAt = performance.now();
  const { apiKey, model } = getGeminiConfiguration();
  const client = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      const status = getErrorStatus(lastError);
      // Overload or rate limit: back off. Other errors get one immediate retry only.
      if (isTransientStatus(status)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 2]));
      } else if (attempt > 2) {
        break;
      }
    }
    try {
      console.info(JSON.stringify({ scope: "document_analysis", event: "gemini_request_started", attempt, textLength: input.text.length }));
      const response = await client.models.generateContent({
        model,
        contents: buildProjectDocumentAnalysisPrompt(input),
        config: { temperature: 0.2, responseMimeType: "application/json" },
      });
      const text = response.text?.trim();
      if (!text) throw new AppError("Gemini returned an empty analysis response.", 502, true);
      const result = normalizeResponse(JSON.parse(text), model);
      incrementMetric("gemini_requests_total", { outcome: "success" });
      incrementMetric("gemini_latency_ms_total", {}, Math.round(performance.now() - startedAt));
      console.info(JSON.stringify({ scope: "document_analysis", event: "gemini_response_received", attempt }));
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        JSON.stringify({
          scope: "document_analysis",
          event: "gemini_request_failed",
          attempt,
          errorType: error instanceof Error ? error.name : "unknown",
          // HTTP status from the SDK's ApiError (e.g. 429, 503), so failures are diagnosable.
          status: getErrorStatus(error),
        })
      );
      incrementMetric("gemini_requests_total", { outcome: "failure" });
    }
  }
  throw new AppError("Unable to generate a valid document analysis.", 502, true, { cause: lastError });
}
