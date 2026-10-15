import { X } from 'lucide-react'

interface EmployeeSkillListProps {
  emptyMessage: string
  items: string[]
  onRemove?: (skillName: string) => void
  title: string
  tone: 'approved' | 'pending'
}

const toneClasses: Record<EmployeeSkillListProps['tone'], { chip: string; dot: string }> = {
  approved: { chip: 'bg-success-bg', dot: 'bg-success-fg' },
  pending: { chip: 'bg-warning-bg', dot: 'bg-warning-fg' },
}

/** Skill chips grouped by approval state, each removable. */
export function EmployeeSkillList({ emptyMessage, items, onRemove, title, tone }: EmployeeSkillListProps) {
  const classes = toneClasses[tone]

  return (
    <div className="flex flex-col gap-2">
      <h3 className="label m-0 flex items-center gap-2 text-text-secondary">
        <span aria-hidden="true" className={`size-2 rounded-pill ${classes.dot}`} />
        {title}
        <span className="num-sm text-text-tertiary">{items.length}</span>
      </h3>
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {items.map((item) => (
            <li key={item}>
              <span className={`label inline-flex items-center gap-1 rounded-sm py-1 pl-2.5 pr-1 text-text-primary ${classes.chip}`}>
                {item}
                {onRemove ? (
                  <button
                    aria-label={`Remove ${item}`}
                    className="inline-flex size-6 items-center justify-center rounded-sm text-text-secondary hover:bg-black/5 hover:text-text-primary"
                    onClick={() => onRemove(item)}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="helper m-0 text-text-tertiary">{emptyMessage}</p>
      )}
    </div>
  )
}
