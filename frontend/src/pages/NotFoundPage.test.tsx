import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../features/auth/hooks/authContext'
import type { AuthContextValue } from '../features/auth/hooks/authContext'
import { NotFoundPage } from './NotFoundPage'

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

function CurrentPath() {
  return <p>{useLocation().pathname}</p>
}

function renderNotFound(isAuthenticated = false, initialEntries = ['/missing']) {
  return render(
    <AuthContext.Provider value={createAuthValue(isAuthenticated)}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<CurrentPath />} path="/previous" />
          <Route element={<CurrentPath />} path="/" />
          <Route element={<CurrentPath />} path="/dashboard" />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('NotFoundPage', () => {
  it('renders the not-found content and title for an unknown public path', () => {
    renderNotFound()

    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
    expect(screen.getByText('The page you\'re looking for doesn\'t exist or may have been moved.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument()
    expect(document.title).toBe('404 | Supervisor AI')
  })

  it('navigates home for unauthenticated users', async () => {
    const user = userEvent.setup()
    renderNotFound()

    await user.click(screen.getByRole('button', { name: 'Go to Home' }))

    expect(screen.getByText('/')).toBeInTheDocument()
  })

  it('navigates to the dashboard for authenticated users', async () => {
    const user = userEvent.setup()
    renderNotFound(true)

    await user.click(screen.getByRole('button', { name: 'Go to Dashboard' }))

    expect(screen.getByText('/dashboard')).toBeInTheDocument()
  })

  it('returns to the previous history entry', async () => {
    const user = userEvent.setup()
    renderNotFound(false, ['/previous', '/missing'])

    await user.click(screen.getByRole('button', { name: 'Go Back' }))

    expect(screen.getByText('/previous')).toBeInTheDocument()
  })
})
