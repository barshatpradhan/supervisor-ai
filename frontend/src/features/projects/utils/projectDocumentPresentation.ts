import type { ProjectDocument, ProjectDocumentAnalysis, ProjectDocumentExtractionStatus } from '../types/projectDocument'

const MAX_PROJECT_DOCUMENT_BYTES = 10 * 1024 * 1024
const supportedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])
const supportedExtensions = new Set(['.pdf', '.docx', '.txt'])

const extractionStatusLabels: Record<ProjectDocumentExtractionStatus, string> = {
  extracted: 'Extracted',
  failed: 'Failed',
  pending: 'Pending',
}

const extractionStatusToneClasses: Record<ProjectDocumentExtractionStatus, string> = {
  extracted: 'border-success-fg/30 bg-success-bg/60 text-success-text',
  failed: 'border-danger-600/20 bg-danger-50 text-danger-700',
  pending: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex < 0) {
    return ''
  }

  return fileName.slice(lastDotIndex).toLowerCase()
}

export function validateProjectDocumentFile(file: File) {
  if (file.size <= 0) {
    return 'The selected file is empty.'
  }

  if (file.size > MAX_PROJECT_DOCUMENT_BYTES) {
    return 'The selected file exceeds the 10 MB size limit.'
  }

  if (!supportedMimeTypes.has(file.type) && !supportedExtensions.has(getFileExtension(file.name))) {
    return 'Only PDF, DOCX, and TXT files are supported.'
  }

  return null
}

export function formatProjectDocumentFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`
  }

  return `${value} B`
}

export function formatProjectDocumentMimeType(value: ProjectDocument['mime_type']) {
  switch (value) {
    case 'application/pdf':
      return 'PDF'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX'
    case 'text/plain':
      return 'TXT'
    default:
      return value
  }
}

export function getProjectDocumentExtractionStatusLabel(status: ProjectDocumentExtractionStatus) {
  return extractionStatusLabels[status]
}

export function getProjectDocumentExtractionStatusTone(status: ProjectDocumentExtractionStatus) {
  return extractionStatusToneClasses[status]
}

export function formatProjectDocumentEstimatedHours(value: ProjectDocumentAnalysis['estimated_hours']) {
  return `${Number(value)} hr${Number(value) === 1 ? '' : 's'}`
}
