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
  const appUser = await getAppUserByAuthId(authUserId);
  await ensureProjectExistsInOrganization(projectId, organizationId);
  assertSupportedFile(file);

  const storagePath = buildStoragePath(projectId, file.originalName);
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new AppError("Unable to store project document.", 500);
  }

  const extraction = await extractDocumentText({
    originalName: file.originalName,
    mimeType: file.mimeType,
    buffer: file.buffer,
  });

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
    await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).remove([storagePath]);
    throw new AppError("Unable to save project document metadata.", 500);
  }

  const analysisResult = await analyzeProjectDocument({
    text: extraction.text,
    fileName: file.originalName,
    mimeType: file.mimeType,
  });

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
    throw new AppError("Unable to save project document analysis.", 500);
  }

  return {
    document,
    analysis,
  };
}
