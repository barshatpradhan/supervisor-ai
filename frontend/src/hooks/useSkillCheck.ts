import { useCallback, useState } from 'react'
import { resolveSkills } from '../services/skills/skillService'
import type { BackendSkillResolution } from '../types/backend'

export interface SkillCheckOutcome {
  /** False when the input is not a skill; nothing should be added. */
  accepted: boolean
  /** The name to add: the catalog name, the AI-corrected name, or the input. */
  name: string
  isApproved: boolean
  category: string | null
  skillId: string | null
  /** Shown under the input; empty when the input was already exactly right. */
  message: string
  tone: 'info' | 'warning' | 'error'
}

/** Turns a backend resolution into what the skill input should do and say. */
export function describeSkillResolution(resolution: BackendSkillResolution): SkillCheckOutcome {
  const { input } = resolution

  if (resolution.status === 'invalid') {
    return {
      accepted: false,
      name: input,
      isApproved: false,
      category: null,
      skillId: null,
      message: `“${input}” isn’t a recognised skill. ${resolution.reason ?? ''}`.trim(),
      tone: 'error',
    }
  }

  if (resolution.skill) {
    const { skill } = resolution
    const matched = resolution.corrected ? `Matched “${input}” to ${skill.name}.` : ''
    return {
      accepted: true,
      name: skill.name,
      isApproved: skill.isApproved,
      category: skill.category,
      skillId: skill.id,
      message: skill.isApproved ? matched : `${matched} ${skill.name} is waiting for platform approval.`.trim(),
      tone: 'info',
    }
  }

  const name = resolution.suggestedName ?? input
  const corrected = resolution.corrected ? ` (corrected from “${input}”)` : ''
  return {
    accepted: true,
    name,
    isApproved: false,
    category: resolution.category,
    skillId: null,
    message:
      resolution.status === 'new'
        ? `${name}${corrected} is new to the app${resolution.category ? ` · ${resolution.category}` : ''}. A platform admin will review it.`
        : `Couldn’t verify “${input}” right now. It will be added as ${name} for a platform admin to review.`,
    tone: resolution.status === 'new' ? 'info' : 'warning',
  }
}

/**
 * Checks a typed skill before it is added: matches the catalog, corrects spelling with AI,
 * or rejects text that is not a skill. If the check itself fails, the skill is added as
 * typed and the server checks it again on save.
 */
export function useSkillCheck() {
  const [isChecking, setIsChecking] = useState(false)

  const check = useCallback(async (input: string): Promise<SkillCheckOutcome> => {
    setIsChecking(true)
    try {
      const [resolution] = await resolveSkills([input])
      if (!resolution) throw new Error('No result')
      return describeSkillResolution(resolution)
    } catch {
      return {
        accepted: true,
        name: input,
        isApproved: false,
        category: null,
        skillId: null,
        message: 'Couldn’t check this skill right now. It will be checked again when you save.',
        tone: 'warning',
      }
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { check, isChecking }
}
