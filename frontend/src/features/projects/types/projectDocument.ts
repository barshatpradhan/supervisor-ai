import type {
  BackendDocumentExtractionStatus,
  BackendProjectDocument,
  BackendProjectDocumentAnalysis,
  BackendProjectDocumentUploadResponse,
  BackendProjectDocumentWithAnalysis,
} from '../../../types/backend'

export type ProjectDocument = BackendProjectDocument
export type ProjectDocumentAnalysis = BackendProjectDocumentAnalysis
export type ProjectDocumentWithAnalysis = BackendProjectDocumentWithAnalysis
export type ProjectDocumentUploadResponse = BackendProjectDocumentUploadResponse
export type ProjectDocumentExtractionStatus = BackendDocumentExtractionStatus

export interface ProjectDocumentUploadState {
  error: string | null
  file: File | null
  isUploading: boolean
}
