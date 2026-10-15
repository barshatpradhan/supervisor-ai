import type { BackendPriorityLevel } from '../../types/backend'

const levels: Record<BackendPriorityLevel, { bars: number; label: string }> = {
  high: { bars: 3, label: 'High' },
  low: { bars: 1, label: 'Low' },
  medium: { bars: 2, label: 'Medium' },
  urgent: { bars: 3, label: 'Urgent' },
}

/** Three signal bars plus a word. Urgent is the only priority in danger-fg. */
export function PriorityTag({ priority }: { priority: BackendPriorityLevel }) {
  const { bars, label } = levels[priority]
  const isUrgent = priority === 'urgent'

  return (
    <span
      className={[
        'label inline-flex items-center gap-1.5 whitespace-nowrap',
        isUrgent ? 'text-danger-fg' : 'text-text-secondary',
      ].join(' ')}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            className={[
              'w-[3px] rounded-[1px]',
              bar <= bars ? (isUrgent ? 'bg-danger-fg' : 'bg-text-secondary') : 'bg-border-strong',
            ].join(' ')}
            key={bar}
            style={{ height: `${4 + bar * 3}px` }}
          />
        ))}
      </span>
      {label}
    </span>
  )
}
