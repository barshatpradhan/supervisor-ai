import crypto from "node:crypto";
import path from "node:path";
import { supabase } from "../config/supabase.js";
import {
  MAX_PROJECT_DOCUMENT_BYTES,
  PROJECT_DOCUMENT_BUCKET,
  SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES,
} from "../middleware/uploadMiddleware.js";
import type {
  ProjectDocumentAnalysisSummary,
  ProjectDocumentSummary,
  ProjectDocumentWithAnalysis,
  ProjectDocumentUploadResult,
  UploadedProjectDocumentFile,
} from "../types/document.js";
import { AppError } from "../utils/appError.js";
import { analyzeProjectDocument } from "./aiService.js";
import { extractDocumentText } from "./documentExtractionService.js";
import { ensureProjectExistsInOrganization } from "./projectService.js";
import { getAppUserByAuthId } from "./userService.js";
import { incrementMetric } from "../middleware/observabilityMiddleware.js";

const DOCUMENT_SELECT = `
  id,
  project_id,
  original_filename,
  mime_type,
  size_bytes,
  extraction_status,
  extraction_error,
  extracted_text,
  created_at,
  updated_at
`;

const ANALYSIS_SELECT = `
  id,
  required_skills,
  preferred_skills,
  complexity,
  estimated_hours,
  summary,
  suggested_roles,
  risks,
  provider,
  model,
  created_at
`;

interface ProjectDocumentRow extends ProjectDocumentSummary {}

interface ProjectDocumentAnalysisRow extends ProjectDocumentAnalysisSummary {
  document_id: string;
}

function assertSupportedFile(file: UploadedProjectDocumentFile) {
  if (file.size <= 0) {
    throw new AppError("Uploaded document is empty.", 400);
  }

  if (file.size > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new AppError("Uploaded document exceeds the 10 MB size limit.", 400);
  }

  if (
    !SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES.includes(
      file.mimeType as (typeof SUPPORTED_PROJECT_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    throw new AppError("Unsupported document type.", 400);
  }

  const header = file.buffer.subarray(0, 8);
  const isPdf = header.subarray(0, 5).toString("ascii") === "%PDF-";
  const isZip = header[0] === 0x50 && header[1] === 0x4b;
  const isText = !header.some((byte) => byte === 0);
  const validContent = file.mimeType === "application/pdf" ? isPdf
    : file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? isZip
      : isText;
  if (!validContent) throw new AppError("Uploaded file content does not match its declared type.", 400);
}

function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const baseName = parsed.name
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const extension = parsed.ext.toLowerCase();

  return `${baseName || "document"}${extension}`;
}

function buildStoragePath(projectId: string, fileName: string) {
  const uniqueId = crypto.randomUUID();
  return `${projectId}/${uniqueId}-${sanitizeFileName(fileName)}`;
}

async function removeIncompleteDocument(documentId: string, storagePath: string) {
  const [documentResult, storageResult] = await Promise.allSettled([
    supabase.from("project_documents").delete().eq("id", documentId),
    supabase.storage.from(PROJECT_DOCUMENT_BUCKET).remove([storagePath]),
  ]);

  const documentCleanupFailed =
    documentResult.status === "rejected" ||
    (documentResult.status === "fulfilled" && Boolean(documentResult.value.error));
  const storageCleanupFailed =
    storageResult.status === "rejected" ||
    (storageResult.status === "fulfilled" && Boolean(storageResult.value.error));

  if (documentCleanupFailed || storageCleanupFailed) {
    console.error(
      JSON.stringify({
        scope: "document_analysis",
        event: "incomplete_upload_cleanup_failed",
        documentId,
      })
    );
  }
}

async function removeStoredDocument(storagePath: string) {
  try {
    const { error } = await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).remove([storagePath]);
    if (error) {
      console.error(JSON.stringify({ scope: "document_analysis", event: "storage_cleanup_failed" }));
    }
  } catch {
    console.error(JSON.stringify({ scope: "document_analysis", event: "storage_cleanup_failed" }));
  }
}

async function getDocumentAnalysesByDocumentIds(documentIds: string[]) {
  if (documentIds.length === 0) {
    return new Map<string, ProjectDocumentAnalysisSummary>();
  }

  const { data, error } = await supabase
    .from("project_document_analyses")
    .select(`document_id, ${ANALYSIS_SELECT}`)
    .in("document_id", documentIds)
    .returns<ProjectDocumentAnalysisRow[]>();

  if (error) {
    throw new AppError("Unable to fetch project document analyses.", 500);
  }

  return new Map(
    (data ?? []).map((analysis) => {
      const { document_id, ...analysisSummary } = analysis;
      return [document_id, analysisSummary];
    })
  );
}

function attachAnalysesToDocuments(
  documents: ProjectDocumentRow[],
  analysisByDocumentId: Map<string, ProjectDocumentAnalysisSummary>
) {
  return documents.map<ProjectDocumentWithAnalysis>((document) => ({
    document,
    analysis: analysisByDocumentId.get(document.id) ?? null,
  }));
}

export async function listProjectDocuments(
  authUserId: string,
  organizationId: string,
  projectId: string
): Promise<ProjectDocumentWithAnalysis[]> {
  await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);

  const { data, error } = await supabase
    .from("project_documents")
    .select(DOCUMENT_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .returns<ProjectDocumentRow[]>();

  if (error) {
    throw new AppError("Unable to fetch project documents.", 500);
  }

  const documents = data ?? [];
  const analysisByDocumentId = await getDocumentAnalysesByDocumentIds(
    documents.map((document) => document.id)
  );

  return attachAnalysesToDocuments(documents, analysisByDocumentId);
}

export async function getProjectDocumentById(
  authUserId: string,
  organizationId: string,
  projectId: string,
  documentId: string
): Promise<ProjectDocumentWithAnalysis> {
  await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);

  const { data, error } = await supabase
    .from("project_documents")
    .select(DOCUMENT_SELECT)
    .eq("id", documentId)
    .eq("project_id", projectId)
    .single<ProjectDocumentRow>();

  if (error || !data) {
    throw new AppError("Project document not found.", 404);
  }

  const analysisByDocumentId = await getDocumentAnalysesByDocumentIds([data.id]);

  return {
    document: data,
    analysis: analysisByDocumentId.get(data.id) ?? null,
  };
}

export async function uploadProjectDocument(
  authUserId: string,
  organizationId: string,
  projectId: string,
  file: UploadedProjectDocumentFile
): Promise<ProjectDocumentUploadResult> {
  const startedAt = Date.now();
  const appUser = await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);
  assertSupportedFile(file);

  const storagePath = buildStoragePath(projectId, file.originalName);
  console.info(
    JSON.stringify({
      scope: "document_analysis",
      event: "upload_started",
      projectId,
      mimeType: file.mimeType,
      sizeBytes: file.size,
    })
  );
  incrementMetric("document_uploads_total");
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new AppError("Unable to store project document.", 500);
  }

  let extraction;
  try {
    extraction = await extractDocumentText({
      originalName: file.originalName,
      mimeType: file.mimeType,
      buffer: file.buffer,
    });
    console.info(
      JSON.stringify({
        scope: "document_analysis",
        event: "extraction_completed",
        projectId,
        pageCount: extraction.pageCount,
        textLength: extraction.text.length,
        durationMs: Date.now() - startedAt,
      })
    );
  } catch (error) {
    await removeStoredDocument(storagePath);
    console.error(
      JSON.stringify({
        scope: "document_analysis",
        event: "extraction_failed",
        projectId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown",
      })
    );
    throw error;
  }

  const { data: document, error: documentError } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      uploaded_by_user_id: appUser.id,
      storage_bucket: PROJECT_DOCUMENT_BUCKET,
      storage_path: storagePath,
      original_filename: file.originalName,
      mime_type: file.mimeType,
      size_bytes: file.size,
      extracted_text: extraction.text || null,
      extraction_status: extraction.status,
      extraction_error: extraction.error ?? null,
    })
    .select(DOCUMENT_SELECT)
    .single<ProjectDocumentUploadResult["document"]>();

  if (documentError || !document) {
    await removeStoredDocument(storagePath);
    throw new AppError("Unable to save project document metadata.", 500);
  }

  let analysisResult;
  try {
    analysisResult = await analyzeProjectDocument({
      text: extraction.text,
      mimeType: file.mimeType,
    });
  } catch (error) {
    await removeIncompleteDocument(document.id, storagePath);
    console.error(
      JSON.stringify({
        scope: "document_analysis",
        event: "analysis_failed",
        projectId,
        documentId: document.id,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "unknown",
      })
    );
    throw error;
  }

  const { data: analysis, error: analysisError } = await supabase
    .from("project_document_analyses")
    .insert({
      document_id: document.id,
      project_id: projectId,
      required_skills: analysisResult.requiredSkills,
      preferred_skills: analysisResult.preferredSkills,
      complexity: analysisResult.complexity,
      estimated_hours: analysisResult.estimatedHours,
      summary: analysisResult.summary,
      suggested_roles: analysisResult.suggestedRoles,
      risks: analysisResult.risks,
      provider: analysisResult.provider,
      model: analysisResult.model,
      raw_result: analysisResult.rawResult,
    })
    .select(ANALYSIS_SELECT)
    .single<ProjectDocumentUploadResult["analysis"]>();

  if (analysisError || !analysis) {
    await removeIncompleteDocument(document.id, storagePath);
    console.error(
      JSON.stringify({
        scope: "document_analysis",
        event: "analysis_save_failed",
        projectId,
        documentId: document.id,
        durationMs: Date.now() - startedAt,
      })
    );
    throw new AppError("Unable to save project document analysis.", 500);
  }

  console.info(
    JSON.stringify({
      scope: "document_analysis",
      event: "analysis_saved",
      projectId,
      documentId: document.id,
      durationMs: Date.now() - startedAt,
    })
  );
  incrementMetric("document_upload_duration_ms_total", {}, Date.now() - startedAt);

  return {
    document,
    analysis,
  };
}
