import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Message } from '../types/messaging'
import { MessageItem } from './MessageItem'

const message: Message = {
  body: 'Ana, the review estimate looks off',
  clientId: null,
  conversationId: 'conv-1',
  createdAt: '2026-10-20T10:00:00.000Z',
  deletedAt: null,
  editedAt: null,
  id: 'msg-1',
  kind: 'text',
  mentions: [],
  reactions: [],
  sender: { name: 'Avery Admin', userId: 'admin' },
  shownForTask: false,
  task: { accessible: true, assignee: { name: 'Cleo', userId: 'me' }, progressPercent: 10, status: 'in_progress', taskId: 'task-1', title: 'Review' },
  updatedAt: '2026-10-20T10:00:00.000Z',
}

function renderItem(overrides: Partial<Message>) {
  return render(
    <MemoryRouter>
      <ul>
        <MessageItem
          askingTaskId={null}
          canAskForUpdate={false}
          currentUserId="me"
          message={{ ...message, ...overrides }}
          onAskForUpdate={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onToggleReaction={vi.fn()}
          readOnly={false}
        />
      </ul>
    </MemoryRouter>,
  )
}

describe('MessageItem', () => {
  it('labels an earlier message shown because it tags your task', () => {
    renderItem({ shownForTask: true })
    expect(screen.getByText('Earlier message about your task')).toHaveAttribute(
      'title',
      'Sent before you joined this channel. You can see it because it tags a task now assigned to you.',
    )
  })

  it('shows no label on ordinary messages', () => {
    renderItem({ shownForTask: false })
    expect(screen.queryByText('Earlier message about your task')).not.toBeInTheDocument()
  })
})
