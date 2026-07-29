import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectRecommendationCard } from './ProjectRecommendationsSection'

const recommendation = {
  employeeId: 'employee-1',
  fullName: 'Jordan Lee',
  employeeName: 'Jordan Lee',
  score: 87.25,
  rank: 1,
  matchScore: 87.25,
  confidenceScore: 90,
  matchedRequiredSkills: ['React'],
  matchedPreferredSkills: ['Accessibility'],
  missingRequiredSkills: ['TypeScript'],
  missingPreferredSkills: [],
  workloadPercentage: 42,
  availabilityPercentage: 58,
  performanceScore: 94,
  estimatedProjectHours: 40,
  weeklyCapacityHours: 32,
  suitability: 'strong' as const,
  reasons: ['Matches 1 required project skill.', 'Current workload is 42% with 58% availability.'],
  matchedSkills: ['React', 'Accessibility'],
  missingSkills: ['TypeScript'],
  summary: 'Backend-provided explanation.',
  scoreBreakdown: {
    skillMatch: 80,
    availability: 58,
    performance: 94,
    workload: 58,
    proficiency: 80,
  },
}

describe('ProjectRecommendationCard', () => {
  it('renders persisted recommendation fields without assignment controls', () => {
    render(<ProjectRecommendationCard recommendation={recommendation} />)

    expect(screen.getByLabelText('Rank 1: Jordan Lee')).toBeInTheDocument()
    expect(screen.getByText('87.25')).toBeInTheDocument()
    expect(screen.getByText('Matches 1 required project skill.')).toBeInTheDocument()
    expect(screen.getByLabelText('Required skills matched')).toHaveTextContent('React')
    expect(screen.getByLabelText('Preferred skills matched')).toHaveTextContent('Accessibility')
    expect(screen.getByLabelText('Missing skills')).toHaveTextContent('TypeScript')
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument()
  })

  it('renders the score breakdown only from returned backend fields', () => {
    render(<ProjectRecommendationCard recommendation={recommendation} />)

    expect(screen.getByText('Score breakdown')).toBeInTheDocument()
    expect(screen.getByText('Proficiency')).toBeInTheDocument()
  })
})
