import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Header } from './Header'

describe('Header', () => {
  it("shows the signed-in user's chosen avatar", () => {
    render(<Header onOpenNavigation={() => {}} onSignOut={() => {}} userAvatarVariant="p05-s5-c4-a2" userEmail="ada@example.test" userId="user-1" userName="Ada Lovelace" />)
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar).not.toHaveTextContent('AL')
    expect(avatar).toHaveAttribute('data-motion', 'hover')
  })

  it('shows initials until an avatar is chosen', () => {
    render(<Header onOpenNavigation={() => {}} onSignOut={() => {}} userEmail="ada@example.test" userName="Ada Lovelace" />)
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL')
  })
})
