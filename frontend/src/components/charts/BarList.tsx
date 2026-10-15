import type { ColorToken, Datum } from './chartColors'
import { tokenColor } from './chartColors'

interface BarListProps {
  color?: ColorToken
  data: Datum[]
  max?: number
  nameWidth?: number
  overColor?: ColorToken
  threshold?: number
  unit?: string
}

/**
 * Horizontal bars for ranking people or skills. Values sit at the bar end; an optional
 * dashed threshold marks a limit, and bars at or past it turn danger-fg.
 */
export function BarList({
  color = 'chart-1',
  data,
  max = 100,
  nameWidth = 112,
  overColor = 'danger-fg',
  threshold,
  unit = '%',
}: BarListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {data.map((item) => {
        const isOver = threshold !== undefined && item.value >= threshold
        const width = Math.max(0, Math.min(100, (item.value / max) * 100))
        return (
          <li
            className="grid items-center gap-3"
            key={item.name}
            style={{ gridTemplateColumns: `minmax(0, ${nameWidth}px) minmax(0, 1fr) 48px` }}
          >
            <span className="body truncate text-text-primary" title={item.name}>{item.name}</span>
            <span aria-hidden="true" className="relative h-2.5 rounded-pill bg-chart-track">
              <span
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: tokenColor(isOver ? overColor : item.color ?? color), width: `${width}%` }}
              />
              {threshold !== undefined ? (
                <span
                  className="absolute -inset-y-1 border-l-2 border-dashed"
                  style={{ borderColor: tokenColor('chart-threshold'), left: `${(threshold / max) * 100}%` }}
                />
              ) : null}
            </span>
            <span className={['num-sm text-right', isOver ? 'text-danger-fg' : 'text-text-primary'].join(' ')}>
              {Math.round(item.value)}{unit}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
