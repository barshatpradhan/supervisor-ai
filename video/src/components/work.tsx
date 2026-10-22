import { useCurrentFrame } from 'remotion'
import type { Person } from '../data/demo.ts'
import { AVATAR_SIZE, variantOn } from '../data/surfaces.ts'
import { mix, progress } from '../theme.ts'
import { ProgressBar, StatusBadge } from './app.ts'
import { PersonAvatar } from './PersonAvatar.tsx'

type Column = 'todo' | 'in_progress' | 'review' | 'completed'
const COLUMNS: Array<[Column, string]> = [['todo', 'To do'], ['in_progress', 'In progress'], ['review', 'In review'], ['completed', 'Completed']]

export interface BoardCard {
  id: string
  title: string
  hours: number
  owner: Person
  column: Column
  /** Task's own progress, shown under the title when set. */
  progress?: number
  /** Frame at which the card arrives in `column` (it slides from `fromColumn`, or in from above). */
  movedAt?: number
  fromColumn?: Column
  highlight?: boolean
  /** Position within the column (0 = top). */
  row?: number
}

/** Task board with the app's columns, status badges and 28 px assignee avatars. */
export function TaskBoard({ cards, counts, height = 520 }: { cards: BoardCard[]; counts: Record<Column, number>; height?: number }) {
  const frame = useCurrentFrame()
  const columnWidth = 280
  const gap = 16
  return (
    <div className="relative" style={{ height }}>
      {COLUMNS.map(([key], index) => (
        <section className="absolute top-0 flex flex-col gap-3 rounded-card border border-border-default bg-surface-inset p-3" key={key} style={{ left: index * (columnWidth + gap), width: columnWidth, height }}>
          <header className="flex items-center justify-between">
            <StatusBadge status={key} />
            <span className="num-sm text-text-tertiary">{counts[key]}</span>
          </header>
        </section>
      ))}
      {cards.map((card) => {
        const columnIndex = COLUMNS.findIndex(([key]) => key === card.column)
        const fromIndex = card.fromColumn ? COLUMNS.findIndex(([key]) => key === card.fromColumn) : columnIndex
        const p = card.movedAt === undefined ? 1 : progress(frame, card.movedAt)
        const left = mix(p, fromIndex, columnIndex) * (columnWidth + gap) + 12
        const enteringFromAbove = card.movedAt !== undefined && !card.fromColumn
        return (
          <article
            className={['absolute flex flex-col gap-2 rounded-control border bg-surface-card p-3 shadow-card', card.highlight ? 'border-border-primary' : 'border-border-default'].join(' ')}
            key={card.id}
            style={{ left, top: 52 + (card.row ?? 0) * 124, width: columnWidth - 24, opacity: enteringFromAbove ? p : 1, transform: enteringFromAbove ? `translateY(${(1 - p) * -24}px)` : undefined }}
          >
            <span className="body-strong text-text-primary">{card.title}</span>
            {card.progress !== undefined ? <ProgressBar label={`${card.title} progress`} size="sm" value={card.progress} /> : null}
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PersonAvatar name={card.owner.name} size={AVATAR_SIZE.taskBoard} variant={variantOn('taskBoard', card.owner.avatarVariant)} />
                <span className="helper text-text-secondary">{card.owner.name}</span>
              </span>
              <span className="num-sm text-text-tertiary">{card.hours}h</span>
            </span>
          </article>
        )
      })}
    </div>
  )
}

export interface WorkloadRow {
  person: Person
  from: number
  to: number
  changeAt?: number
}

/** Team workload rows (32 px avatars), bars against the dashed 80% line. */
export function WorkloadList({ rows, threshold = 80 }: { rows: WorkloadRow[]; threshold?: number }) {
  const frame = useCurrentFrame()
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border-default bg-surface-card p-5 shadow-card">
      <div>
        <p className="section-title m-0 text-text-primary">Team workload</p>
        <p className="helper m-0 text-text-tertiary">Dashed line marks the {threshold}% limit</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row) => {
          const value = row.changeAt === undefined ? row.to : mix(progress(frame, row.changeAt, 15), row.from, row.to)
          const over = value >= threshold
          return (
            <li className="flex items-center gap-3" key={row.person.id}>
              <PersonAvatar name={row.person.name} size={AVATAR_SIZE.workloadList} variant={variantOn('workloadList', row.person.avatarVariant)} />
              <span className="body w-32 truncate text-text-primary">{row.person.name}</span>
              <span className="relative h-3 flex-1 rounded-pill bg-chart-track">
                <span className={['absolute inset-y-0 left-0 rounded-pill', over ? 'bg-danger-fg' : 'bg-chart-1'].join(' ')} style={{ width: `${value}%` }} />
                <span className="absolute -inset-y-1 border-l-2 border-dashed border-text-tertiary" style={{ left: `${threshold}%` }} />
              </span>
              <span className="num-sm w-12 text-right text-text-primary">{Math.round(value)}%</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Project progress as the supervisor dashboard draws it: a bar and "done/total tasks". */
export function ProjectProgress({ title, from, to, changeAt, doneBefore, doneAfter, total }: { title: string; from: number; to: number; changeAt: number; doneBefore: number; doneAfter: number; total: number }) {
  const frame = useCurrentFrame()
  const p = progress(frame, changeAt, 18)
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border-default bg-surface-card p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <span className="body-strong text-text-primary">{title}</span>
        <span className="num-sm text-text-primary">{p < 0.5 ? doneBefore : doneAfter}/{total} tasks</span>
      </div>
      <ProgressBar label={`${title} progress`} showValue={false} value={mix(p, from, to)} />
    </section>
  )
}
