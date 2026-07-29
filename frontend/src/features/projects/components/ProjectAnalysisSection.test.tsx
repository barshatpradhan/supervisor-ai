import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectAnalysisContent } from './ProjectAnalysisSection'

const document = {
  id: 'document-1',
  project_id: 'project-1',
  original_filename: 'requirements.pdf',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  extraction_status: 'extracted' as const,
  extraction_error: null,
  extracted_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const entry = {
  document,
  analysis: {
    id: 'analysis-1',
    summary: 'Build a dependable project workspace for distributed teams.',
    complexity: 'high' as const,
    estimated_hours: 42.5,
    required_skills: ['React', 'TypeScript'],
    preferred_skills: ['Accessibility'],
    suggested_roles: ['Frontend developer'],
    risks: [],
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    created_at: '2026-01-02T00:00:00.000Z',
  },
}

describe('ProjectAnalysisContent', () => {
  it('renders persisted analysis fields without exposing raw provider output', () => {
    render(<ProjectAnalysisContent document={document} entry={entry} />)

    expect(screen.getByText(entry.analysis.summary)).toBeInTheDocument()
    expect(screen.getByText('Complexity: high')).toBeInTheDocument()
    expect(screen.getByText('42.5')).toBeInTheDocument()
    expect(screen.getByLabelText('Required skills')).toHaveTextContent('React')
    expect(screen.getByLabelText('Preferred skills')).toHaveTextContent('Accessibility')
    expect(screen.getByText('Frontend developer')).toBeInTheDocument()
    expect(screen.queryByText(/raw_result/i)).not.toBeInTheDocument()
  })

  it('handles absent preferred skills safely', () => {
    render(<ProjectAnalysisContent document={document} entry={{ ...entry, analysis: { ...entry.analysis, preferred_skills: [] } }} />)

    expect(screen.getByText('No preferred skills were identified.')).toBeInTheDocument()
  })
})
