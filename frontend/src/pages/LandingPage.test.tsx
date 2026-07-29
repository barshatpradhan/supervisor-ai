import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

vi.mock('../features/auth/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))

describe('LandingPage', () => {
  it('shows the supported product story and public actions', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /turn project requirements/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /create organization/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /sign in/i }).every((link) => link.getAttribute('href') === '/login')).toBe(true)
    expect(screen.getByText(/AI requirement analysis/i)).toBeInTheDocument()
    expect(screen.queryByText(/customers|SOC 2|guaranteed/i)).not.toBeInTheDocument()
  })
})
