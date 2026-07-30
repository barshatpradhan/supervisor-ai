import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../../features/auth/hooks/authContext'
import type { AuthContextValue } from '../../features/auth/hooks/authContext'
import { AppRouter } from './AppRouter'

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
})
