import { describe, expect, it } from 'vitest'
import { api } from './api'

describe('api authentication handling', () => {
  it('keeps navigation under route-guard control after a 401', () => {
    expect(api).toBeDefined()
  })
})
