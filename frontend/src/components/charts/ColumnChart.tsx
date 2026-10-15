import type { ColorToken, Datum } from './chartColors'
import { tokenColor } from './chartColors'

interface ColumnChartProps {
  color?: ColorToken
  data: Datum[]
  height?: number
  unit?: string
}

function niceMax(value: number) {
  if (value <= 4) return Math.max(2, Math.ceil(value / 2) * 2)
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

/** Three to six categories, with the value printed above each column. Horizontal grid only. */
export function ColumnChart({ color = 'chart-1', data, height = 200, unit = '' }: ColumnChartProps) {
  const max = niceMax(Math.max(1, ...data.map((item) => item.value)))
  // niceMax is even or a round magnitude, so halves land on whole numbers.
  const ticks = [max, max / 2]
  const plotHeight = height - 48

  return (
    <div aria-hidden="true" className="relative box-border pb-6 pl-7" style={{ height }}>
      {ticks.map((tick) => {
        const top = 16 + plotHeight * (1 - tick / max)
        return (
          <div key={tick}>
            <div className="absolute left-7 right-0 border-t border-chart-grid" style={{ top }} />
            <span className="num-xs absolute left-0 text-chart-axis" style={{ top: top - 8 }}>{tick}</span>
          </div>
        )
      })}
      <div className="relative flex h-full items-end gap-4">
        {data.map((item) => (
          <div className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" key={item.name}>
            <span className="num-sm text-text-primary">{item.value}{unit}</span>
            <div
              className="w-full max-w-10 rounded-t-sm"
              style={{ background: tokenColor(item.color ?? color), height: `${(item.value / max) * plotHeight}px` }}
            />
            <span className="helper absolute -bottom-5 max-w-full truncate text-text-secondary">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
