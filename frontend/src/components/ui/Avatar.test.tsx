import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows initials named for the person when no avatar is chosen', () => {
    render(<Avatar name="Ada Lovelace" size={36} />)
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar).toHaveTextContent('AL')
    expect(avatar).toHaveStyle({ width: '36px', height: '36px' })
  })

  it('draws the chosen avatar at any pixel size, with the matching detail tier', () => {
    render(<Avatar name="Ada Lovelace" size={22} variant="p03-s4-c2-a1" />)
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar).not.toHaveTextContent('AL')
    expect(avatar).toHaveAttribute('data-tier', 'xs')
    expect(avatar).toHaveStyle({ width: '22px' })
  })

  it('falls back to initials for an unknown stored ID', () => {
    render(<Avatar name="Ada Lovelace" variant="not-an-avatar" />)
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL')
  })

  it('keeps the dashed placeholder for nobody', () => {
    render(<Avatar name={null} />)
    expect(screen.getByRole('img', { name: 'Unassigned' })).toHaveTextContent('?')
  })
})
