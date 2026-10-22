import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/errors'
import { AuthContext } from '../hooks/authContext'
import type { AuthContextValue } from '../hooks/authContext'
import type { AuthenticatedUser } from '../types/auth'
import { AvatarPicker } from './AvatarPicker'

const baseUser: AuthenticatedUser = {
  avatarVariant: null,
  authUserId: 'auth-1',
  email: 'ada@example.test',
  id: 'user-1',
  legacyRole: null,
  platformRole: null,
  role: null,
}

function Harness({ initial, save }: { initial: string | null; save: (variant: string | null) => Promise<void> }) {
  const [user, setUser] = useState<AuthenticatedUser>({ ...baseUser, avatarVariant: initial })
  const value = {
    updateAvatar: async (variant: string | null) => {
      await save(variant)
      setUser((current) => ({ ...current, avatarVariant: variant }))
    },
    user,
  } as unknown as AuthContextValue
  return (
    <AuthContext.Provider value={value}>
      <AvatarPicker name="Ada Lovelace" />
    </AuthContext.Provider>
  )
}

function renderPicker(initial: string | null = null, save = vi.fn(async () => {})) {
  render(<Harness initial={initial} save={save} />)
  return { save, user: userEvent.setup() }
}

const preview = () => screen.getAllByRole('img', { name: 'Ada Lovelace' })[0]

describe('AvatarPicker', () => {
  it('starts on initials, with options waiting for a character', () => {
    renderPicker()
    expect(preview()).toHaveTextContent('AL')
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save picture' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Use my initials' })).not.toBeInTheDocument()
  })

  it('saves a chosen character with its skin, background and accessory', async () => {
    const { save, user } = renderPicker()
    await user.click(screen.getByRole('radio', { name: /^Afro:/ }))
    await user.click(screen.getByRole('radio', { name: 'Very deep' }))
    await user.click(screen.getByRole('radio', { name: 'Sage' }))
    await user.click(screen.getByRole('radio', { name: 'Glasses' }))
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save picture' }))
    expect(save).toHaveBeenCalledWith('p05-s6-c5-a1')
    expect(await screen.findByText('Profile picture saved.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save picture' })).toBeDisabled()
  })

  it('does not offer earrings when the character covers the ears', async () => {
    const { user } = renderPicker('p02-s3-c3-a3')
    expect(screen.getByRole('radio', { name: 'Earrings' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /^Hijab:/ }))
    expect(screen.getByRole('radio', { name: 'Earrings' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'None' })).toBeChecked()
    expect(screen.getByText(/ears are covered/)).toBeInTheDocument()
  })

  it('Cancel goes back to the saved choice; Use my initials clears it', async () => {
    const { save, user } = renderPicker('p01-s2-c1-a0')
    await user.click(screen.getByRole('radio', { name: 'Headphones' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('radio', { name: 'None' })).toBeChecked()
    expect(save).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Use my initials' }))
    expect(save).toHaveBeenCalledWith(null)
    expect(await screen.findByText('Showing your initials.')).toBeInTheDocument()
    expect(preview()).toHaveTextContent('AL')
  })

  it('explains a rate limit instead of showing a raw error', async () => {
    const save = vi.fn(async () => {
      throw new ApiError('Too many avatar changes.', { retryAfterSeconds: 600, statusCode: 429 })
    })
    const { user } = renderPicker(null, save)
    await user.click(screen.getByRole('radio', { name: /^Crop:/ }))
    await user.click(screen.getByRole('button', { name: 'Save picture' }))
    expect(await screen.findByText(/Try again in 10 min/)).toBeInTheDocument()
  })
})
