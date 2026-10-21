import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageComposer } from './MessageComposer'

const { listTasks } = vi.hoisted(() => ({ listTasks: vi.fn() }))
vi.mock('../../tasks/services/taskService', () => ({ listTasks }))

const ann = { userId: '0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Ann Lee' }

function renderComposer(props: Partial<Parameters<typeof MessageComposer>[0]> = {}) {
  const onSend = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MessageComposer
        conversationTitle="General"
        mentionable={[ann]}
        onSend={onSend}
        organizationId="org-1"
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSend, input: screen.getByRole('combobox', { name: 'Message General' }) }
}

describe('MessageComposer', () => {
  beforeEach(() => listTasks.mockReset())

  it('sends on Enter, adds a line on Shift+Enter, and clears afterwards', async () => {
    const { input, onSend } = renderComposer()

    await userEvent.type(input, 'First line{Shift>}{Enter}{/Shift}second line')
    expect(input).toHaveValue('First line\nsecond line')
    expect(onSend).not.toHaveBeenCalled()

    await userEvent.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith('First line\nsecond line', null)
    expect(input).toHaveValue('')
  })

  it('never sends an empty or whitespace-only message', async () => {
    const { input, onSend } = renderComposer()
    await userEvent.type(input, '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('inserts an emoji from the labelled picker', async () => {
    const { input } = renderComposer()
    await userEvent.type(input, 'Nice ')
    await userEvent.click(screen.getByRole('button', { name: 'Insert emoji' }))
    await userEvent.click(screen.getByRole('button', { name: 'thumbs up' }))
    expect(input).toHaveValue('Nice 👍')
  })

  it('turns a picked @mention into a mention token when sending', async () => {
    const { input, onSend } = renderComposer()
    await userEvent.type(input, 'Hi @an')
    await userEvent.click(screen.getByRole('option', { name: 'Ann Lee' }))
    expect(input).toHaveValue('Hi @Ann Lee ')

    await userEvent.type(input, 'thanks{Enter}')
    expect(onSend).toHaveBeenCalledWith(`Hi <@${ann.userId}> thanks`, null)
  })

  it('attaches a tagged task and sends it with the message', async () => {
    listTasks.mockResolvedValue([{ id: 'task-1', title: 'Ship the API' }, { id: 'task-2', title: 'Write docs' }])
    const { input, onSend } = renderComposer()

    await userEvent.click(screen.getByRole('button', { name: 'Tag a task' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Search tasks' }), 'ship')
    await userEvent.click(await screen.findByRole('button', { name: 'Ship the API' }))
    expect(screen.getByText('Tagged: Ship the API')).toBeInTheDocument()

    await userEvent.type(input, 'Any news?{Enter}')
    expect(onSend).toHaveBeenCalledWith('Any news?', { id: 'task-1', title: 'Ship the API' })
    await waitFor(() => expect(screen.queryByText('Tagged: Ship the API')).not.toBeInTheDocument())
  })

  it('is replaced by an explanation when the conversation is read-only', () => {
    render(
      <MessageComposer
        conversationTitle="Old project"
        disabledReason="This project was deleted, so its channel is read-only."
        mentionable={[]}
        onSend={vi.fn()}
        organizationId="org-1"
      />,
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('read-only')
  })
})
