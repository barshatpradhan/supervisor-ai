/**
 * Fictional demo organisation for the promo video. Every name is invented; every number is either
 * an input chosen here or derived from it with the app's formulas in scoring.ts.
 */
import type { BackendRecommendation } from '../../../frontend/src/types/backend.ts'
import type { PersonSkill } from './scoring.ts'
import { availabilityFromWorkload, projectProgress, scoreCandidate, workloadPercentage } from './scoring.ts'

export const COMPANY = 'Bramblewick Freight'
export const PROJECT = 'Warehouse scanner rollout'
export const DOCUMENT = { name: 'Scanner rollout requirements.pdf', size: '1.4 MB · PDF' }

export const ANALYSIS = {
  requiredSkills: ['Node.js', 'REST APIs', 'PostgreSQL'],
  preferredSkills: ['Offline sync', 'Label printing'],
  complexity: 'High complexity',
  estimatedHours: 56,
  summary: 'Move handheld scanners to the v2 inventory API with batch sync, an offline retry queue and label printing.',
}

export interface Person {
  id: string
  name: string
  email: string
  role: 'supervisor' | 'employee'
  /** The avatar the person chose in the app (users.avatar_variant); null shows initials everywhere. */
  avatarVariant: string | null
  weeklyCapacityHours: number
  /** Hours on To do, In progress, Blocked and Review tasks before the new assignment. */
  activeHours: number
  performance: number
  skills: PersonSkill[]
}

export const SAM: Person = {
  id: 'demo-sam', name: 'Sam Carter', email: 'sam.carter@bramblewick.example', role: 'supervisor',
  avatarVariant: 'p12-s1-c3-a0', weeklyCapacityHours: 40, activeHours: 0, performance: 0, skills: [],
}

export const AISHA: Person = {
  id: 'demo-aisha', name: 'Aisha Bello', email: 'aisha.bello@bramblewick.example', role: 'employee',
  avatarVariant: 'p05-s3-c1-a1', weeklyCapacityHours: 40, activeHours: 12, performance: 91,
  skills: [{ name: 'Node.js', level: 5, years: 6 }, { name: 'REST APIs', level: 5, years: 6 }, { name: 'PostgreSQL', level: 4, years: 4 }, { name: 'Label printing', level: 3, years: 2 }],
}
export const LENA: Person = {
  id: 'demo-lena', name: 'Lena Ortiz', email: 'lena.ortiz@bramblewick.example', role: 'employee',
  avatarVariant: 'p10-s2-c2-a0', weeklyCapacityHours: 32, activeHours: 29, performance: 88,
  skills: [{ name: 'Node.js', level: 5, years: 8 }, { name: 'REST APIs', level: 4, years: 5 }, { name: 'PostgreSQL', level: 5, years: 8 }, { name: 'Offline sync', level: 4, years: 3 }],
}
export const MARCUS: Person = {
  id: 'demo-marcus', name: 'Marcus Lee', email: 'marcus.lee@bramblewick.example', role: 'employee',
  avatarVariant: 'p01-s2-c5-a0', weeklyCapacityHours: 40, activeHours: 28, performance: 84,
  skills: [{ name: 'Node.js', level: 4, years: 3 }, { name: 'REST APIs', level: 4, years: 3 }, { name: 'Label printing', level: 5, years: 5 }, { name: 'Offline sync', level: 3, years: 2 }],
}
export const DANIEL: Person = {
  id: 'demo-daniel', name: 'Daniel Kim', email: 'daniel.kim@bramblewick.example', role: 'employee',
  avatarVariant: null, weeklyCapacityHours: 40, activeHours: 22, performance: 79,
  skills: [{ name: 'PostgreSQL', level: 5, years: 7 }, { name: 'REST APIs', level: 3, years: 2 }],
}
export const TOM: Person = {
  id: 'demo-tom', name: 'Tom Reyes', email: 'tom.reyes@bramblewick.example', role: 'employee',
  avatarVariant: null, weeklyCapacityHours: 20, activeHours: 8, performance: 72,
  skills: [{ name: 'REST APIs', level: 3, years: 1 }, { name: 'Label printing', level: 3, years: 2 }],
}

export const EMPLOYEES = [AISHA, LENA, MARCUS, DANIEL, TOM]
export const PEOPLE = [SAM, ...EMPLOYEES]

export const NEW_TASK = { id: 'demo-task-v2', title: 'v2 inventory endpoints', hours: 14, assignee: AISHA }

export function workloadOf(person: Person, extraHours = 0) {
  const workload = workloadPercentage(person.activeHours + extraHours, person.weeklyCapacityHours)
  return { workload, availability: availabilityFromWorkload(workload) }
}

/** Ranked recommendations in the shape the app's RecommendationCard renders. */
export const RECOMMENDATIONS = EMPLOYEES.map((person) => {
  const { workload, availability } = workloadOf(person)
  const result = scoreCandidate({ ...ANALYSIS, skills: person.skills, availability, performance: person.performance })
  return { person, workload, availability, ...result }
})
  .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
  .map((entry, index) => ({ ...entry, rank: index + 1 }))

function reasonsFor(entry: (typeof RECOMMENDATIONS)[number]) {
  const reasons: string[] = []
  const plural = (n: number) => (n === 1 ? '' : 's')
  if (entry.matchedRequired.length) reasons.push(`Matches ${entry.matchedRequired.length} required project skill${plural(entry.matchedRequired.length)}.`)
  if (entry.missingRequired.length) reasons.push(`Missing required skills: ${entry.missingRequired.join(', ')}.`)
  if (entry.matchedPreferred.length) reasons.push(`Matches ${entry.matchedPreferred.length} preferred project skill${plural(entry.matchedPreferred.length)}.`)
  reasons.push(`Current workload is ${entry.workload}% with ${entry.availability}% availability.`)
  reasons.push(`Performance score is ${entry.person.performance}%.`)
  return reasons
}

export function toBackendRecommendation(entry: (typeof RECOMMENDATIONS)[number], displayScore = entry.score): BackendRecommendation {
  const reasons = reasonsFor(entry)
  const get = (key: string) => entry.breakdown.find((part) => part.key === key)?.score ?? 0
  return {
    employeeId: entry.person.id,
    employeeName: entry.person.name,
    fullName: entry.person.name,
    rank: entry.rank,
    score: displayScore,
    matchScore: displayScore,
    confidenceScore: entry.score,
    matchedRequiredSkills: entry.matchedRequired,
    matchedPreferredSkills: entry.matchedPreferred,
    missingRequiredSkills: entry.missingRequired,
    missingPreferredSkills: entry.missingPreferred,
    matchedSkills: [...entry.matchedRequired, ...entry.matchedPreferred],
    missingSkills: [...entry.missingRequired, ...entry.missingPreferred],
    workloadPercentage: entry.workload,
    availabilityPercentage: entry.availability,
    performanceScore: entry.person.performance,
    estimatedProjectHours: ANALYSIS.estimatedHours,
    weeklyCapacityHours: entry.person.weeklyCapacityHours,
    suitability: entry.suitability,
    reasons,
    summary: reasons.join(' '),
    scoreBreakdown: {
      skillMatch: (get('required') + get('preferred')) / 2,
      availability: entry.availability,
      performance: entry.person.performance,
      workload: 100 - entry.workload,
      requiredSkillMatch: get('required'),
      preferredSkillMatch: get('preferred'),
      proficiency: get('proficiency'),
      experience: get('experience'),
      suitability: entry.suitability,
    },
  }
}

/** Project tasks; total hours equal the analysis estimate. */
export const PROJECT_TASKS = [
  { title: 'Device configuration', hours: 6, owner: DANIEL, status: 'completed' as const },
  { title: 'Label printer integration', hours: 12, owner: MARCUS, status: 'review' as const },
  { title: 'Offline retry queue', hours: 16, owner: LENA, status: 'in_progress' as const },
  { title: 'Scanner QA pass', hours: 8, owner: TOM, status: 'todo' as const },
  { title: NEW_TASK.title, hours: NEW_TASK.hours, owner: AISHA, status: 'todo' as const },
]

const asProgress = (labelPrinterDone: boolean) =>
  PROJECT_TASKS.map((task) => ({ hours: task.hours, completed: task.status === 'completed' || (labelPrinterDone && task.title === 'Label printer integration') }))

export const PROJECT_PROGRESS = {
  afterAssignment: projectProgress(asProgress(false)),
  afterLabelPrinter: projectProgress(asProgress(true)),
  tasksDoneBefore: 1,
  tasksDoneAfter: 2,
  totalTasks: PROJECT_TASKS.length,
}

/** Org-wide board counts (To do, In progress, In review, Completed) at each beat. */
export const BOARD_COUNTS = {
  before: { todo: 8, in_progress: 12, review: 5, completed: 18 },
  assigned: { todo: 9, in_progress: 12, review: 5, completed: 18 },
  aishaStarted: { todo: 8, in_progress: 13, review: 5, completed: 18 },
  labelPrinterDone: { todo: 8, in_progress: 13, review: 4, completed: 19 },
}

export const TASK_PROGRESS = { first: 25, afterForm: 60, note: 'Batch sync merged; retry queue next.' }

export const CHANNELS = [
  { id: 'general', title: 'general', kind: 'organization' as const, visibleToAisha: true },
  { id: 'scanner', title: 'scanner-rollout', kind: 'project' as const, visibleToAisha: true },
  { id: 'dock', title: 'dock-scheduling', kind: 'project' as const, visibleToAisha: false },
]
export const DIRECT_MESSAGES = [
  { id: 'dm-aisha', with: AISHA, visibleToAisha: true },
  { id: 'dm-marcus', with: MARCUS, visibleToAisha: false },
]
/** backend/src/services/messagingService.ts PROGRESS_REQUEST_TEXT, after the @mention. */
export const PROGRESS_REQUEST_TEXT = 'could you share a progress update on this task?'
