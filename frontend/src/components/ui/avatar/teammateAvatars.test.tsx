import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RecommendationCard } from '../../../features/ai-recommendations/components/RecommendationCard'
import { MessageItem } from '../../../features/messaging/components/MessageItem'
import { TaskChip } from '../../../features/messaging/components/TaskChip'
import type { Message } from '../../../features/messaging/types/messaging'
import type { TaskDisplay } from '../../../features/tasks/types/task'
import { resolveAssigneeAvatar } from '../../../features/tasks/utils/taskBoard'
import type { BackendRecommendation } from '../../../types/backend'

/** A character avatar draws a face layer; initials draw a text span instead. */
const drawsCharacter = (element: HTMLElement) => element.querySelector('.av-face') !== null

describe('teammates’ avatars in lists', () => {
  it('message senders show their character, or initials without one', () => {
    const message: Message = {
      body: 'Ready for review',
      clientId: null,
      conversationId: 'conv-1',
      createdAt: '2026-10-20T10:00:00.000Z',
      deletedAt: null,
      editedAt: null,
      id: 'msg-1',
      kind: 'text',
      mentions: [],
      reactions: [],
      sender: { avatarVariant: 'p05-s3-c1-a1', name: 'Aisha Bello', userId: 'aisha' },
      shownForTask: false,
      task: null,
      updatedAt: '2026-10-20T10:00:00.000Z',
    }
    const item = (sender: Message['sender']) => (
      <MemoryRouter>
        <ul>
          <MessageItem askingTaskId={null} canAskForUpdate={false} currentUserId="me" message={{ ...message, sender }} onAskForUpdate={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onToggleReaction={vi.fn()} readOnly={false} />
        </ul>
      </MemoryRouter>
    )
    const { rerender } = render(item(message.sender))
    expect(drawsCharacter(screen.getByRole('img', { name: 'Aisha Bello' }))).toBe(true)

    rerender(item({ avatarVariant: null, name: 'Ben Okafor', userId: 'ben' }))
    const initials = screen.getByRole('img', { name: 'Ben Okafor' })
    expect(drawsCharacter(initials)).toBe(false)
    expect(initials).toHaveTextContent('BO')
  })

  it('task chips draw no avatar, and a restricted chip shows no person at all', () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <TaskChip chip={{ accessible: true, assignee: { name: 'Aisha Bello', userId: 'aisha' }, progressPercent: 25, status: 'in_progress', taskId: 't-1', title: 'v2 endpoints' }} />
      </MemoryRouter>,
    )
    expect(container.querySelector('.av')).toBeNull()

    rerender(<MemoryRouter><TaskChip chip={{ accessible: false }} /></MemoryRouter>)
    expect(container.querySelector('.av')).toBeNull()
    expect(screen.getByText('Restricted task')).toBeInTheDocument()
    expect(screen.queryByText('Aisha Bello')).not.toBeInTheDocument()
  })

  it('recommendation cards show the candidate’s character', () => {
    const rec = {
      avatarVariant: 'p10-s2-c2-a0',
      availabilityPercentage: 9,
      confidenceScore: 75,
      employeeId: 'lena',
      employeeName: 'Lena Ortiz',
      estimatedProjectHours: 56,
      fullName: 'Lena Ortiz',
      matchScore: 75.15,
      matchedPreferredSkills: [],
      matchedRequiredSkills: ['Node.js'],
      matchedSkills: ['Node.js'],
      missingPreferredSkills: [],
      missingRequiredSkills: [],
      missingSkills: [],
      performanceScore: 88,
      rank: 2,
      reasons: [],
      score: 75.15,
      scoreBreakdown: { availability: 9, performance: 88, skillMatch: 75, workload: 9 },
      suitability: 'strong',
      summary: '',
      weeklyCapacityHours: 32,
      workloadPercentage: 91,
    } satisfies BackendRecommendation
    render(<RecommendationCard rec={rec} />)
    expect(drawsCharacter(screen.getByRole('img', { name: 'Lena Ortiz' }))).toBe(true)
  })

  it('task assignees: own avatar for "You", the directory’s only beside a known name, else initials', () => {
    const task = (assignmentState: TaskDisplay['assignmentState'], assigned_employee_id: string | null) =>
      ({ assigned_employee_id, assignmentState }) as TaskDisplay
    const names = new Map([['e-aisha', 'Aisha Bello']])
    const avatars = new Map<string, string | null>([['e-aisha', 'p05-s3-c1-a1'], ['e-ghost', 'p01-s1-c1-a0']])

    expect(resolveAssigneeAvatar(task('self', 'e-me'), names, avatars, 'p12-s1-c3-a0')).toBe('p12-s1-c3-a0')
    expect(resolveAssigneeAvatar(task('assigned', 'e-aisha'), names, avatars, null)).toBe('p05-s3-c1-a1')
    expect(resolveAssigneeAvatar(task('assigned', 'e-ghost'), names, avatars, null)).toBeNull()
    expect(resolveAssigneeAvatar(task('unassigned', null), names, avatars, 'p12-s1-c3-a0')).toBeNull()
  })
})
