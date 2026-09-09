import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProjectList } from './ProjectList'

describe('ProjectList', () => {
  it('renders backend project fields with semantic status and priority labels', () => {
    render(
      <MemoryRouter>
        <ProjectList projects={[{ id: 'project-1', title: 'Website refresh', description: 'Refresh the public website.', status: 'active', priority: 'high', required_skills: ['React', 'TypeScript'], created_by_user_id: 'user-1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' }]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Website refresh')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText(/required skills: react, typescript/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Website refresh/ })).toHaveAttribute('href', '/projects/project-1')
  })
})
