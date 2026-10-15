const statusStyles: Record<string, { dot: string; label: string }> = {
  // Tasks
  todo: { dot: 'bg-status-todo', label: 'To do' },
  in_progress: { dot: 'bg-status-in-progress', label: 'In progress' },
  review: { dot: 'bg-status-review', label: 'In review' },
  blocked: { dot: 'bg-status-blocked', label: 'Blocked' },
  completed: { dot: 'bg-status-completed', label: 'Completed' },
  cancelled: { dot: 'bg-status-cancelled', label: 'Cancelled' },
  // Projects
  draft: { dot: 'bg-status-todo', label: 'Draft' },
  active: { dot: 'bg-status-in-progress', label: 'Active' },
  on_hold: { dot: 'bg-warning-fg', label: 'On hold' },
  // Documents
  pending: { dot: 'bg-chart-ai', label: 'Processing' },
  extracted: { dot: 'bg-status-completed', label: 'Extracted' },
  failed: { dot: 'bg-status-blocked', label: 'Failed' },
  // Skill approvals and people
  approved: { dot: 'bg-status-completed', label: 'Approved' },
  rejected: { dot: 'bg-status-blocked', label: 'Rejected' },
  over: { dot: 'bg-status-blocked', label: 'Over limit' },
  near: { dot: 'bg-warning-fg', label: 'Near capacity' },
  available: { dot: 'bg-status-completed', label: 'Available' },
}

interface StatusBadgeProps {
  label?: string
  status: string
}

/** A neutral pill with a colored dot and the status word, so status never relies on color alone. */
export function StatusBadge({ label, status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { dot: 'bg-status-todo', label: status }

  return (
    <span className="label inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill bg-surface-muted px-2.5 py-0.5 text-text-primary">
      <span aria-hidden="true" className={`size-2 rounded-pill ${style.dot}`} />
      {label ?? style.label}
    </span>
  )
}
