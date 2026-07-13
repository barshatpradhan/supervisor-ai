export type SupportedDocumentMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

export type DocumentExtractionStatus = "pending" | "extracted" | "failed";

export interface UploadedProjectDocumentFile {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface DocumentExtractionInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface DocumentExtractionResult {
  text: string;
  status: DocumentExtractionStatus;
  error?: string;
}

export interface ProjectDocumentUploadResult {
  document: {
    id: string;
    project_id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    extraction_status: DocumentExtractionStatus;
    extraction_error: string | null;
    extracted_text: string | null;
    created_at: string;
    updated_at: string;
  };
  analysis: {
    id: string;
    required_skills: string[];
    preferred_skills: string[];
    complexity: "low" | "medium" | "high";
    estimated_hours: number;
    summary: string;
    suggested_roles: string[];
    risks: string[];
    provider: string;
    model: string | null;
    created_at: string;
  };
}

export interface ProjectDocumentAnalysisSummary {
  id: string;
  required_skills: string[];
  preferred_skills: string[];
  complexity: "low" | "medium" | "high";
  estimated_hours: number;
  summary: string;
  suggested_roles: string[];
  risks: string[];
  provider: string;
  model: string | null;
  created_at: string;
}

export interface ProjectDocumentSummary {
  id: string;
  project_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  extraction_status: DocumentExtractionStatus;
  extraction_error: string | null;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocumentWithAnalysis {
  document: ProjectDocumentSummary;
  analysis: ProjectDocumentAnalysisSummary | null;
}
