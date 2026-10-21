import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../types/messaging'
import { useMessageThread } from './useMessageThread'

const service = vi.hoisted(() => ({
  addReaction: vi.fn(),
  deleteMessage: vi.fn(),
  editMessage: vi.fn(),
  listMessageChanges: vi.fn(),
  listMessages: vi.fn(),
  markConversationRead: vi.fn(),
  removeReaction: vi.fn(),
  sendMessage: vi.fn(),
}))
vi.mock('../services/messagingService', () => service)

function serverMessage(overrides: Partial<Message>): Message {
  return {
    body: 'Hello',
    clientId: null,
    conversationId: 'conv-1',
    createdAt: '2026-10-21T10:00:00.000Z',
    deletedAt: null,
    editedAt: null,
    id: 'msg-1',
    kind: 'text',
    mentions: [],
    reactions: [],
    sender: { userId: 'me', name: 'Me' },
    task: null,
    updatedAt: '2026-10-21T10:00:00.000Z',
    ...overrides,
  }
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useMessageThread('org-1', 'conv-1', 'me'), { wrapper })
}

describe('useMessageThread optimistic send', () => {
  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset())
    service.listMessages.mockResolvedValue({ messages: [], nextCursor: null })
    service.listMessageChanges.mockResolvedValue({ messages: [], syncedAt: '2026-10-21T10:00:00.000Z', hasMore: false })
    service.markConversationRead.mockResolvedValue({ conversationId: 'conv-1', lastReadAt: '2026-10-21T10:00:00.000Z' })
  })

  it('shows the message at once, then replaces it with the server copy', async () => {
    let resolveSend: (message: Message) => void = () => {}
    service.sendMessage.mockImplementation((_conversationId, request) =>
      new Promise<Message>((resolve) => {
        resolveSend = (message) => resolve({ ...message, clientId: request.clientId })
      }),
    )

    const { result } = setup()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.send('Hello', null))
    expect(result.current.pending).toEqual([expect.objectContaining({ body: 'Hello', status: 'sending' })])
    expect(result.current.messages).toHaveLength(0)

    await waitFor(() => expect(service.sendMessage).toHaveBeenCalledTimes(1))
    await act(async () => resolveSend(serverMessage({})))
    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['msg-1']))
    expect(result.current.pending).toEqual([])
  })

  it('marks a failed send for retry and retries with the same clientId', async () => {
    service.sendMessage.mockRejectedValueOnce(new Error('Network error'))
    const { result } = setup()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.send('Try me', { id: 'task-1', title: 'Ship it' }))
    await waitFor(() => expect(result.current.pending[0]).toMatchObject({ status: 'failed', error: 'Network error' }))

    const firstClientId = service.sendMessage.mock.calls[0][1].clientId
    expect(service.sendMessage.mock.calls[0][1]).toMatchObject({ body: 'Try me', taskId: 'task-1' })

    service.sendMessage.mockImplementationOnce(async (_conversationId, request) =>
      serverMessage({ id: 'msg-2', body: 'Try me', clientId: request.clientId }),
    )
    act(() => result.current.retry(firstClientId))

    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['msg-2']))
    expect(service.sendMessage.mock.calls[1][1].clientId).toBe(firstClientId)
    expect(result.current.pending).toEqual([])
  })

  it('lets the user discard a failed message', async () => {
    service.sendMessage.mockRejectedValueOnce(new Error('Too many requests'))
    const { result } = setup()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.send('Nope', null))
    await waitFor(() => expect(result.current.pending[0]?.status).toBe('failed'))
    act(() => result.current.discard(result.current.pending[0].clientId))
    expect(result.current.pending).toEqual([])
  })
})
