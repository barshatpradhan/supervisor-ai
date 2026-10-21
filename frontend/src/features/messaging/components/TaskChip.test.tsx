import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TaskChip } from './TaskChip'

const chip = {
  accessible: true as const,
  taskId: 'task-1',
  title: 'Ship the API',
  status: 'in_progress' as const,
  progressPercent: 40,
  assignee: { userId: 'user-2', name: 'Asha' },
}

describe('TaskChip', () => {
  it('shows title, status, assignee and progress, and links to the task', () => {
    render(<MemoryRouter><TaskChip chip={chip} /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Ship the API' })).toHaveAttribute('href', '/tasks/task-1')
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Asha')).toBeInTheDocument()
    expect(screen.getByText('40% complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask for update' })).not.toBeInTheDocument()
  })

  it('offers "Ask for update" only when given a handler', async () => {
    const onAsk = vi.fn()
    render(<MemoryRouter><TaskChip chip={chip} onAskForUpdate={onAsk} /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Ask for update' }))
    expect(onAsk).toHaveBeenCalledWith('task-1')
  })

  it('shows a restricted placeholder with no task details or link', () => {
    const { container } = render(<MemoryRouter><TaskChip chip={{ accessible: false }} onAskForUpdate={vi.fn()} /></MemoryRouter>)

    expect(screen.getByText('Restricted task')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/complete|In progress|Ship/)
  })
})
