/**
 * The app's formulas, mirrored so every number in the video follows from the demo inputs.
 * Sources: backend/src/services/recommendationService.ts (scoring), employeeMetricsService.ts
 * (workload, availability) and dashboardService.ts (project progress). demo.test.ts pins the results.
 */

export const SCORE_WEIGHTS = {
  requiredSkills: 50,
  preferredSkills: 15,
  availability: 15,
  performance: 10,
  proficiency: 5,
  experience: 5,
} as const

export type Suitability = 'strong' | 'moderate' | 'weak'

export interface PersonSkill {
  name: string
  /** 1-5 */
  level: number
  years: number
}

const clamp = (value: number) => Math.max(0, Math.min(100, value))
export const roundScore = (value: number) => Math.round(value * 100) / 100

/** round(active hours / weekly capacity x 100), capped at 100. */
export function workloadPercentage(activeHours: number, weeklyCapacityHours: number) {
  if (weeklyCapacityHours <= 0) return activeHours > 0 ? 100 : 0
  return Math.min(100, Math.round((Math.max(0, activeHours) / weeklyCapacityHours) * 100))
}

export const availabilityFromWorkload = (workload: number) => clamp(100 - workload)

const scorePercentage = (matched: number, total: number) => (total === 0 ? null : (matched / total) * 100)

export interface ScoreInput {
  requiredSkills: string[]
  preferredSkills: string[]
  skills: PersonSkill[]
  availability: number
  performance: number | null
}

export function scoreCandidate(input: ScoreInput) {
  const find = (target: string) => input.skills.find((skill) => skill.name === target)
  const matchedRequired = input.requiredSkills.filter((skill) => find(skill))
  const missingRequired = input.requiredSkills.filter((skill) => !find(skill))
  const matchedPreferred = input.preferredSkills.filter((skill) => find(skill))
  const missingPreferred = input.preferredSkills.filter((skill) => !find(skill))
  const matched = [...matchedRequired, ...matchedPreferred].map((name) => find(name)!)
  const proficiency = matched.length === 0 ? 0 : matched.reduce((sum, skill) => sum + clamp(skill.level * 20), 0) / matched.length
  const experience = matched.length === 0 ? 0 : matched.reduce((sum, skill) => sum + clamp(skill.years * 10), 0) / matched.length
  const required = scorePercentage(matchedRequired.length, input.requiredSkills.length)
  const preferred = scorePercentage(matchedPreferred.length, input.preferredSkills.length)

  const components = [
    { key: 'required', label: 'Required skills', score: required, weight: SCORE_WEIGHTS.requiredSkills },
    { key: 'preferred', label: 'Preferred skills', score: preferred, weight: SCORE_WEIGHTS.preferredSkills },
    { key: 'availability', label: 'Availability', score: input.availability, weight: SCORE_WEIGHTS.availability },
    { key: 'performance', label: 'Performance', score: input.performance, weight: SCORE_WEIGHTS.performance },
    { key: 'proficiency', label: 'Proficiency', score: matched.length > 0 ? proficiency : null, weight: SCORE_WEIGHTS.proficiency },
    { key: 'experience', label: 'Experience', score: matched.length > 0 ? experience : null, weight: SCORE_WEIGHTS.experience },
  ] as const
  const eligible = components.filter((component) => component.score !== null)
  const totalWeight = eligible.reduce((sum, component) => sum + component.weight, 0)
  const score = roundScore(eligible.reduce((sum, component) => sum + (component.score! * component.weight) / totalWeight, 0))
  const suitability: Suitability = score >= 75 && missingRequired.length === 0 ? 'strong' : score >= 50 ? 'moderate' : 'weak'

  return {
    score,
    suitability,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    breakdown: components.map((component) => ({
      ...component,
      contribution: component.score === null ? 0 : (component.score * component.weight) / totalWeight,
    })),
  }
}

/** Completed hours / total hours, as a percentage with two decimals. Partial progress never counts. */
export function projectProgress(tasks: Array<{ hours: number; completed: boolean }>) {
  const total = tasks.reduce((sum, task) => sum + task.hours, 0)
  const done = tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.hours, 0)
  return total === 0 ? 0 : clamp(Math.round((done / total) * 10000) / 100)
}
