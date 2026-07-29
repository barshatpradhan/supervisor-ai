import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RegisterOrganizerPage } from './RegisterOrganizerPage'

vi.mock('../features/auth/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false, isLoading: false, register: vi.fn() }) }))
vi.mock('../features/organizations/hooks/useOrganization', () => ({ useOrganization: () => ({ refreshOrganizations: vi.fn(), selectOrganization: vi.fn() }) }))

describe('RegisterOrganizerPage', () => {
  it('renders the organizer-only registration fields', () => {
    render(<MemoryRouter><RegisterOrganizerPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /organization administrator account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Employee')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Supervisor')).not.toBeInTheDocument()
  })
})
