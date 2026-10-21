import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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

  it('in a project channel, offers only that project\'s tasks for tagging', async () => {
    listTasks.mockResolvedValue([
      { id: 'task-1', project_id: 'project-a', title: 'Ship the API' },
      { id: 'task-2', project_id: 'project-b', title: 'Ship the docs' },
    ])
    renderComposer({ taskProjectId: 'project-a' })

    await userEvent.click(screen.getByRole('button', { name: 'Tag a task' }))
    expect(await screen.findByRole('button', { name: 'Ship the API' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ship the docs' })).not.toBeInTheDocument()
    expect(screen.getByText('Tasks in this project you can access')).toBeInTheDocument()
  })

  it('starts with a prefilled task and offers suggested mentions without adding them', async () => {
    const lee = { userId: '6c4f1e2a-3b5d-4e7f-9a1b-2c3d4e5f6a7b', name: 'Lee Supervisor' }
    const { input, onSend } = renderComposer({
      initialTask: { id: 'task-1', title: 'Ship the API' },
      mentionable: [ann, lee],
      suggestedMentions: [lee],
    })

    expect(screen.getByText('Tagged: Ship the API')).toBeInTheDocument()
    const suggestions = screen.getByRole('group', { name: 'Suggested people to mention' })
    expect(input).toHaveValue('')

    await userEvent.click(within(suggestions).getByRole('button', { name: 'Mention Lee Supervisor' }))
    expect(input).toHaveValue('@Lee Supervisor ')
    expect(screen.queryByRole('group', { name: 'Suggested people to mention' })).not.toBeInTheDocument()

    await userEvent.type(input, 'is this blocked?{Enter}')
    expect(onSend).toHaveBeenCalledWith(`<@${lee.userId}> is this blocked?`, { id: 'task-1', title: 'Ship the API' })
  })

  it('autocompletes only the people it is given', async () => {
    const { input } = renderComposer({ mentionable: [ann] })
    await userEvent.type(input, '@')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Ann Lee'])
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
