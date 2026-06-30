import { Button } from '../../../components/ui/Button'

interface EmployeeSkillListProps {
  emptyMessage: string
  items: string[]
  onRemove?: (skillName: string) => void
  title: string
  tone: 'approved' | 'pending'
}

const toneClasses: Record<EmployeeSkillListProps['tone'], string> = {
  approved: 'border-success-fg/30 bg-success-bg/60 text-success-text',
  pending: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
}

export function EmployeeSkillList({
  emptyMessage,
  items,
  onRemove,
  title,
  tone,
}: EmployeeSkillListProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <span className="text-xs font-semibold uppercase tracking-normal text-ink-500">
          {items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item}>
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
                  toneClasses[tone],
                ].join(' ')}
              >
                <span>{item}</span>
                {onRemove ? (
                  <Button
                    aria-label={`Remove ${item}`}
                    className="h-6 min-h-6 rounded-full px-2 text-current hover:bg-black/5"
                    onClick={() => onRemove(item)}
                    type="button"
                    variant="ghost"
                  >
                    x
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-600">{emptyMessage}</p>
      )}
    </div>
  )
}
