import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectRecommendationCard } from './ProjectRecommendationsSection'

const recommendation = {
  avatarVariant: null,
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

    const card = screen.getByLabelText('Rank 1: Jordan Lee')
    expect(card).toBeInTheDocument()
    expect(screen.getByText('87.25')).toBeInTheDocument()
    expect(screen.getByText('Strong fit')).toBeInTheDocument()
    expect(within(card).getByText('1/2')).toBeInTheDocument()
    expect(screen.getAllByText('Matches 1 required project skill.')).toHaveLength(2) // headline + full reasons
    expect(screen.getByLabelText('Required skills matched')).toHaveTextContent('React')
    expect(screen.getByLabelText('Preferred skills matched')).toHaveTextContent('Accessibility')
    expect(screen.getByLabelText('Missing skills')).toHaveTextContent('TypeScript')
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument()
  })

  it('renders the score breakdown only from returned backend fields', () => {
    render(<ProjectRecommendationCard recommendation={recommendation} />)

    expect(screen.getByText('Score breakdown')).toBeInTheDocument()
    expect(screen.getByText('Proficiency')).toBeInTheDocument()
    expect(screen.queryByText('Experience')).not.toBeInTheDocument()
  })

  it('previews up to three missing skills and counts the rest', () => {
    render(
      <ProjectRecommendationCard
        recommendation={{ ...recommendation, missingRequiredSkills: ['TypeScript', 'GraphQL', 'Docker', 'AWS', 'Redis'] }}
      />,
    )

    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('highlights the top match with its details open, and offers assignment when allowed', async () => {
    const onAssign = vi.fn()
    render(<ProjectRecommendationCard featured onAssign={onAssign} recommendation={recommendation} />)

    expect(screen.getByText('Top match')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Jordan Lee match score: 87%' })).toBeInTheDocument()
    expect(screen.getByText('Why this match').closest('details')).toHaveAttribute('open')

    await userEvent.click(screen.getByRole('button', { name: 'Assign employee' }))
    expect(onAssign).toHaveBeenCalledTimes(1)
  })

  it('keeps details collapsed for other candidates', () => {
    render(<ProjectRecommendationCard recommendation={{ ...recommendation, rank: 2 }} />)

    expect(screen.queryByText('Top match')).not.toBeInTheDocument()
    expect(screen.getByText('Why this match').closest('details')).not.toHaveAttribute('open')
  })
})
