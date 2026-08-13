import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../features/auth/hooks/authContext'
import type { AuthContextValue } from '../../features/auth/hooks/authContext'
import { AppRouter } from './AppRouter'

vi.mock('../../pages/InvitationAcceptPage', () => ({
  InvitationAcceptPage: () => <h1>Public invitation acceptance</h1>,
}))

function createAuthValue(isAuthenticated: boolean): AuthContextValue {
  return {
    error: null,
    isAuthenticated,
    isLoading: false,
    status: isAuthenticated ? 'authenticated' : 'unauthenticated',
    login: async () => {},
    logout: () => {},
    onboarding: null,
    platformRole: null,
    register: async () => {},
    registerInvitation: async () => {},
    refreshAuth: async () => {},
    role: null,
    signup: async () => {},
    user: null,
  }
}

function renderRouter(pathname: string, isAuthenticated = false) {
  return render(
    <AuthContext.Provider value={createAuthValue(isAuthenticated)}>
      <MemoryRouter initialEntries={[pathname]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppRouter', () => {
  it.each(['/random', '/abc', '/dashboard/random', '/projects/random/random', '/login/random'])(
    'renders the 404 page for %s without redirecting',
    (pathname) => {
      renderRouter(pathname)

      expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument()
    },
  )

  it('renders the 404 page for unknown paths while authenticated', () => {
    renderRouter('/dashboard/random', true)

    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument()
  })

  it('keeps the public home route available', () => {
    renderRouter('/')

    expect(screen.getByRole('heading', { name: /turn project requirements/i })).toBeInTheDocument()
  })

  it('keeps invitation acceptance public while unauthenticated', () => {
    renderRouter('/invitations/accept?token=test-token')
    expect(screen.getByRole('heading', { name: /public invitation acceptance/i })).toBeInTheDocument()
  })
})
