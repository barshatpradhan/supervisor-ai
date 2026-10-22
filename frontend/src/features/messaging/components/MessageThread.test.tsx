import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationMember, ConversationSummary } from '../types/messaging'
import { MessageThread } from './MessageThread'

const service = vi.hoisted(() => ({
  addReaction: vi.fn(),
  deleteMessage: vi.fn(),
  editMessage: vi.fn(),
  listConversationMembers: vi.fn(),
  listMessageChanges: vi.fn(),
  listMessages: vi.fn(),
  markConversationRead: vi.fn(),
  removeReaction: vi.fn(),
  requestTaskProgress: vi.fn(),
  sendMessage: vi.fn(),
}))
vi.mock('../services/messagingService', () => service)
vi.mock('../../tasks/services/taskService', () => ({ listTasks: vi.fn().mockResolvedValue([]) }))

const projectChannel: ConversationSummary = {
  directPeer: null,
  id: 'conv-p',
  kind: 'project',
  lastMessageAt: null,
  lastMessagePreview: null,
  projectId: 'project-p',
  readOnly: false,
  title: 'Project P',
  unreadCount: 0,
  unreadMentions: 0,
}

const members: ConversationMember[] = [
  { avatarVariant: null, isProjectCreator: false, name: 'Ella Employee', role: 'employee', userId: 'me' },
  { avatarVariant: null, isProjectCreator: true, name: 'Cara Creator', role: 'supervisor', userId: 'cara' },
  { avatarVariant: null, isProjectCreator: false, name: 'Abe Admin', role: 'organization_admin', userId: 'abe' },
  { avatarVariant: null, isProjectCreator: false, name: 'Ben Builder', role: 'employee', userId: 'ben' },
]

function renderThread(props: Partial<Parameters<typeof MessageThread>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MessageThread
          conversation={projectChannel}
          currentRole="employee"
          currentUserId="me"
          onOpenConversations={vi.fn()}
          organizationId="org-1"
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MessageThread in a project channel', () => {
  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset())
    service.listMessages.mockResolvedValue({ messages: [], nextCursor: null })
    service.listMessageChanges.mockResolvedValue({ hasMore: false, messages: [], syncedAt: '2026-10-22T10:00:00.000Z' })
    service.markConversationRead.mockResolvedValue({ conversationId: 'conv-p', lastReadAt: '2026-10-22T10:00:00.000Z' })
    service.listConversationMembers.mockResolvedValue(members)
  })

  it('autocompletes @mentions from the channel members only, never the sender', async () => {
    renderThread()
    const input = await screen.findByRole('combobox', { name: 'Message Project P' })

    await userEvent.type(input, '@')
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Cara Creator', 'Abe Admin', 'Ben Builder'])
    expect(service.listConversationMembers).toHaveBeenCalledWith('conv-p')
  })

  it('opens "Ask about this task" with the task tagged and the project creator suggested first', async () => {
    renderThread({ prefillTask: { id: 'task-1', title: 'Ship the API' } })

    expect(await screen.findByText('Tagged: Ship the API')).toBeInTheDocument()
    const suggested = await screen.findAllByRole('button', { name: /^Mention / })
    expect(suggested.map((button) => button.getAttribute('aria-label'))).toEqual(['Mention Cara Creator', 'Mention Abe Admin'])
  })

  it('does not offer suggestions without a prefilled task, nor a project link to employees', async () => {
    renderThread()
    await screen.findByRole('combobox', { name: 'Message Project P' })
    expect(screen.queryByRole('group', { name: 'Suggested people to mention' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open project' })).not.toBeInTheDocument()
  })

  it('still links admins to the project', async () => {
    renderThread({ currentRole: 'organization_admin' })
    expect(await screen.findByRole('link', { name: 'Open project' })).toHaveAttribute('href', '/projects/project-p')
  })
})
