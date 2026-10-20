import { describe, expect, it } from 'vitest'
import type { BackendSkillResolution } from '../types/backend'
import { describeSkillResolution } from './useSkillCheck'

function resolution(overrides: Partial<BackendSkillResolution>): BackendSkillResolution {
  return {
    input: 'reactjs',
    status: 'catalog',
    skill: null,
    suggestedName: null,
    category: null,
    corrected: false,
    reason: null,
    matchedBy: 'alias',
    ...overrides,
  }
}

describe('describeSkillResolution', () => {
  it('uses the catalog name and says what it matched', () => {
    const outcome = describeSkillResolution(
      resolution({ corrected: true, skill: { category: 'Frontend', id: 's1', isApproved: true, name: 'React' } }),
    )
    expect(outcome).toMatchObject({ accepted: true, isApproved: true, name: 'React', skillId: 's1' })
    expect(outcome.message).toBe('Matched “reactjs” to React.')
  })

  it('stays quiet when the input was already exactly right', () => {
    const outcome = describeSkillResolution(
      resolution({ input: 'React', skill: { category: 'Frontend', id: 's1', isApproved: true, name: 'React' } }),
    )
    expect(outcome.message).toBe('')
  })

  it('rejects text that is not a skill', () => {
    const outcome = describeSkillResolution(resolution({ input: 'asdfgh', reason: 'Random letters.', status: 'invalid' }))
    expect(outcome.accepted).toBe(false)
    expect(outcome.message).toBe('“asdfgh” isn’t a recognised skill. Random letters.')
  })

  it('adds new skills under the corrected name for review', () => {
    const outcome = describeSkillResolution(
      resolution({ category: 'Backend', corrected: true, input: 'kafka stream', status: 'new', suggestedName: 'Kafka Streams' }),
    )
    expect(outcome).toMatchObject({ accepted: true, isApproved: false, name: 'Kafka Streams' })
    expect(outcome.message).toContain('corrected from “kafka stream”')
  })
})
