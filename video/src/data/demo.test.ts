// Pins every number the video shows to the app's formulas. Run: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseAvatarId, formatAvatarId } from '../../../frontend/src/components/ui/avatar/avatar-core.ts'
import { AISHA, DANIEL, PEOPLE, PROJECT_PROGRESS, PROJECT_TASKS, ANALYSIS, RECOMMENDATIONS, TOM, NEW_TASK, workloadOf } from './demo.ts'

test('match scores follow from the 50/15/15/10/5/5 breakdown', () => {
  assert.deepEqual(
    RECOMMENDATIONS.map((entry) => [entry.person.name, entry.score, entry.suitability]),
    [
      ['Aisha Bello', 83.6, 'strong'],
      ['Lena Ortiz', 75.15, 'strong'],
      ['Marcus Lee', 66.86, 'moderate'],
      ['Daniel Kim', 54.23, 'moderate'],
      ['Tom Reyes', 44.12, 'weak'],
    ],
  )
  const aisha = RECOMMENDATIONS[0]
  assert.deepEqual(aisha.breakdown.map((part) => [part.key, part.score, part.contribution]), [
    ['required', 100, 50],
    ['preferred', 50, 7.5],
    ['availability', 70, 10.5],
    ['performance', 91, 9.1],
    ['proficiency', 85, 4.25],
    ['experience', 45, 2.25],
  ])
})

test('workload and availability come from active hours and capacity', () => {
  assert.deepEqual(workloadOf(AISHA), { workload: 30, availability: 70 })
  assert.deepEqual(workloadOf(AISHA, NEW_TASK.hours), { workload: 65, availability: 35 })
  assert.deepEqual(RECOMMENDATIONS.map((entry) => entry.workload), [30, 91, 70, 55, 40])
})

test('project progress counts completed hours only', () => {
  assert.equal(PROJECT_TASKS.reduce((sum, task) => sum + task.hours, 0), ANALYSIS.estimatedHours)
  assert.equal(PROJECT_PROGRESS.afterAssignment, 10.71)
  assert.equal(PROJECT_PROGRESS.afterLabelPrinter, 32.14)
})

test('every chosen avatar ID is valid; only Daniel and Tom have none', () => {
  for (const person of PEOPLE) {
    if (person.avatarVariant === null) continue
    const config = parseAvatarId(person.avatarVariant)
    assert.ok(config, person.name)
    assert.equal(formatAvatarId(config), person.avatarVariant)
  }
  assert.deepEqual(PEOPLE.filter((person) => person.avatarVariant === null), [DANIEL, TOM])
})
