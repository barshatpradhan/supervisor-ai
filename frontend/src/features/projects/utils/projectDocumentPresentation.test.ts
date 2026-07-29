import { describe, expect, it } from 'vitest'
import {
  getProjectDocumentExtractionStatusLabel,
  validateProjectDocumentFile,
} from './projectDocumentPresentation'

describe('project document presentation', () => {
  it('accepts backend-supported PDF files', () => {
    const file = new File(['%PDF-1.7'], 'requirements.pdf', { type: 'application/pdf' })
    expect(validateProjectDocumentFile(file)).toBeNull()
  })

  it('rejects unsupported file types and empty files', () => {
    expect(validateProjectDocumentFile(new File(['data'], 'notes.csv', { type: 'text/csv' }))).toBe('Only PDF, DOCX, and TXT files are supported.')
    expect(validateProjectDocumentFile(new File([], 'empty.txt', { type: 'text/plain' }))).toBe('The selected file is empty.')
  })

  it('rejects files over the backend 10 MB limit', () => {
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.txt', { type: 'text/plain' })
    expect(validateProjectDocumentFile(oversized)).toBe('The selected file exceeds the 10 MB size limit.')
  })

  it('uses only backend extraction status labels', () => {
    expect(getProjectDocumentExtractionStatusLabel('pending')).toBe('Pending')
    expect(getProjectDocumentExtractionStatusLabel('extracted')).toBe('Extracted')
    expect(getProjectDocumentExtractionStatusLabel('failed')).toBe('Failed')
  })
})
