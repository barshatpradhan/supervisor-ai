import { describe, expect, it } from 'vitest'
import { isPublicRoute } from './api'

describe('isPublicRoute', () => {
  it('keeps public routes public during stale-session recovery', () => {
    expect(isPublicRoute('/')).toBe(true)
    expect(isPublicRoute('/login')).toBe(true)
    expect(isPublicRoute('/register')).toBe(true)
    expect(isPublicRoute('/invitations/accept')).toBe(true)
    expect(isPublicRoute('/dashboard')).toBe(false)
  })
})
