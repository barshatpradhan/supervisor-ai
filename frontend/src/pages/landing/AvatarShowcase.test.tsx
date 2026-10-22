import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvatarShowcase } from './AvatarShowcase'

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: () => {},
    matches: reduced && query.includes('reduce'),
    media: query,
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('AvatarShowcase', () => {
  it('plays the three scenes in order and loops', () => {
    mockReducedMotion(false)
    vi.useFakeTimers()
    render(<AvatarShowcase />)
    expect(screen.getByText('Pick a character')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.getByText('Make it yours')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.getByText('See it everywhere')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.getByText('Pick a character')).toBeInTheDocument()
  })

  it('can be paused', async () => {
    mockReducedMotion(false)
    const user = userEvent.setup()
    render(<AvatarShowcase />)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a still final frame, without controls, for reduced motion', () => {
    mockReducedMotion(true)
    render(<AvatarShowcase />)
    expect(screen.getByText('See it everywhere')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })
})
