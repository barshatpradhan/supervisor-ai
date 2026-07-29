import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectDetailsContent } from './ProjectDetailsModule'

const project = {
  id: 'project-1',
  title: 'Website refresh',
  description: 'Refresh the public website.',
  status: 'active' as const,
  priority: 'high' as const,
  required_skills: ['React', 'TypeScript', 'Accessibility'],
  created_by_user_id: 'user-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

describe('ProjectDetailsContent', () => {
  it('renders project data, semantic metadata, and required skills', () => {
    render(<ProjectDetailsContent organizationName="Acme Studio" project={project} />)

    expect(screen.getByRole('heading', { name: 'Website refresh' })).toBeInTheDocument()
    expect(screen.getByText('Acme Studio')).toBeInTheDocument()
    expect(screen.getByText('Refresh the public website.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Required skills' })).toHaveTextContent('React')
    expect(screen.getByText('Accessibility')).toBeInTheDocument()
    expect(screen.getByText('Project metadata')).toBeInTheDocument()
    expect(screen.getByLabelText('Documents: coming next')).toBeInTheDocument()
  })

  it('renders an accessible empty skills state', () => {
    render(<ProjectDetailsContent organizationName="Acme Studio" project={{ ...project, required_skills: [] }} />)

    expect(screen.getByText('No required skills have been recorded for this project.')).toBeInTheDocument()
  })
})
