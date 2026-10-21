import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { listTasks } from '../../tasks/services/taskService'
import type { TaggedTask } from '../types/messaging'

interface TaskTagPickerProps {
  organizationId: string
  onSelect: (task: TaggedTask) => void
}

/**
 * "Tag a task": searches the caller's own task list (GET /tasks), which the backend already
 * limits to the tasks they can access.
 */
export function TaskTagPicker({ onSelect, organizationId }: TaskTagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const tasks = useQuery({
    enabled: open,
    queryFn: listTasks,
    queryKey: ['messaging', organizationId, 'taggable-tasks'],
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const query = search.trim().toLowerCase()
  const matches = (tasks.data ?? [])
    .filter((task) => !query || task.title.toLowerCase().includes(query))
    .slice(0, 20)

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Tag a task"
        className="inline-flex size-9 items-center justify-center rounded-control text-text-secondary transition hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        onClick={() => setOpen((value) => !value)}
        title="Tag a task"
        type="button"
      >
        <ListChecks aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div
          aria-label="Tag a task"
          className="absolute bottom-full left-0 z-30 mb-2 w-80 rounded-card border border-border-default bg-surface-card p-2 shadow-overlay"
          id={panelId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setOpen(false)
            }
          }}
          role="dialog"
        >
          <label className="sr-only" htmlFor={`${panelId}-search`}>Search tasks</label>
          <input
            autoFocus
            className="mb-2 h-9 w-full rounded-control border border-border-strong bg-surface-card px-2 text-sm"
            id={`${panelId}-search`}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            value={search}
          />
          {tasks.isPending ? <p className="m-0 p-2 text-sm text-text-secondary" role="status">Loading tasks…</p> : null}
          {tasks.isError ? <p className="m-0 p-2 text-sm text-danger-fg" role="alert">Tasks could not be loaded.</p> : null}
          {tasks.isSuccess && matches.length === 0 ? <p className="m-0 p-2 text-sm text-text-secondary">No matching tasks.</p> : null}
          <ul className="m-0 max-h-56 list-none overflow-y-auto p-0">
            {matches.map((task) => (
              <li key={task.id}>
                <button
                  className="w-full truncate rounded-control px-2 py-1.5 text-left text-sm text-text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-focus-ring"
                  onClick={() => {
                    onSelect({ id: task.id, title: task.title })
                    setOpen(false)
                    setSearch('')
                  }}
                  type="button"
                >
                  {task.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
