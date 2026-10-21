import type {
  BackendDocumentExtractionStatus,
  BackendProjectDocument,
  BackendProjectDocumentAnalysis,
  BackendProjectDocumentWithAnalysis,
} from '../../../types/backend'

export type ProjectDocument = BackendProjectDocument
export type ProjectDocumentAnalysis = BackendProjectDocumentAnalysis
export type ProjectDocumentWithAnalysis = BackendProjectDocumentWithAnalysis
export type ProjectDocumentExtractionStatus = BackendDocumentExtractionStatus

export interface ProjectDocumentUploadState {
  error: string | null
  file: File | null
  isUploading: boolean
}
