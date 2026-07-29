import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecommendationAssignmentDialog } from './RecommendationAssignmentDialog'

vi.mock('../../../services/recommendations/recommendationService', () => ({
  assignProjectRecommendation: vi.fn(),
}))

const recommendation = {
  employeeId: 'employee-internal-id',
  fullName: 'Jordan Lee',
  employeeName: 'Jordan Lee',
  score: 87.25,
  rank: 1,
  matchScore: 87.25,
  confidenceScore: 90,
  matchedRequiredSkills: ['React'],
  matchedPreferredSkills: [],
  missingRequiredSkills: [],
  missingPreferredSkills: [],
  workloadPercentage: 30,
  availabilityPercentage: 70,
  performanceScore: 90,
  estimatedProjectHours: 20,
  weeklyCapacityHours: 40,
  suitability: 'strong' as const,
  reasons: ['Matches required skills.'],
  matchedSkills: ['React'],
  missingSkills: [],
  summary: 'Matches required skills.',
  scoreBreakdown: { skillMatch: 100, availability: 70, performance: 90, workload: 70 },
}

const task = {
  id: 'task-internal-id', project_id: 'project-1', title: 'Build landing page', description: null,
  status: 'todo' as const, priority: 'high' as const, estimated_hours: 8,
  assigned_employee_id: null, created_by_user_id: 'user-1', assigned_at: null,
  completed_at: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
}

describe('RecommendationAssignmentDialog', () => {
  it('shows the recommendation summary and supported assignment modes without internal IDs', () => {
    const queryClient = new QueryClient()
    render(<QueryClientProvider client={queryClient}><RecommendationAssignmentDialog onOpenChange={vi.fn()} open organizationId="org-1" projectId="project-1" recommendation={recommendation} recommendationRunId="run-1" tasks={[task]} /></QueryClientProvider>)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Assign Jordan Lee' })).toBeInTheDocument()
    expect(screen.getByText('87.25')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Existing task' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Create task' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Build landing page/ })).toBeInTheDocument()
    expect(screen.queryByText('employee-internal-id')).not.toBeInTheDocument()
    expect(screen.queryByText('task-internal-id')).not.toBeInTheDocument()
  })
})
