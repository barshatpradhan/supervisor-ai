import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AskAboutTaskLink } from './AskAboutTaskLink'

const { listConversations } = vi.hoisted(() => ({ listConversations: vi.fn() }))
vi.mock('../services/messagingService', () => ({ listConversations }))

const projectChannel = {
  directPeer: null,
  id: 'conv-project-a',
  kind: 'project',
  lastMessageAt: null,
  lastMessagePreview: null,
  projectId: 'project-a',
  readOnly: false,
  title: 'Project A',
  unreadCount: 0,
  unreadMentions: 0,
}

function renderLink(projectId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AskAboutTaskLink organizationId="org-1" projectId={projectId} taskId="task-1" taskTitle="Ship the API" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AskAboutTaskLink', () => {
  beforeEach(() => listConversations.mockReset())

  it("opens the project's channel with the task tagged", async () => {
    listConversations.mockResolvedValue([projectChannel])
    renderLink('project-a')

    const link = await screen.findByRole('link', { name: 'Ask about Ship the API in the project channel' })
    expect(link).toHaveAttribute('href', '/messages/conv-project-a?task=task-1')
    expect(link).toHaveTextContent('Ask about this task')
  })

  it('is hidden when the user cannot open that project channel', async () => {
    listConversations.mockResolvedValue([projectChannel])
    renderLink('project-b')

    await waitFor(() => expect(listConversations).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('is hidden for a read-only (deleted project) channel', async () => {
    listConversations.mockResolvedValue([{ ...projectChannel, readOnly: true }])
    renderLink('project-a')

    await waitFor(() => expect(listConversations).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
