import type { Datum } from './chartColors'
import { tokenColor } from './chartColors'

interface DonutChartProps {
  centerLabel?: string
  data: Required<Datum>[]
  legend?: 'right' | 'below'
  size?: number
  thickness?: number
}

/** Parts of a whole: the total in the centre and a legend with every count and share. */
export function DonutChart({ centerLabel, data, legend = 'right', size = 140, thickness = 16 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const visible = data.filter((item) => item.value > 0)
  // A 2px gap separates slices, standing in for the surface-card stroke.
  const gap = visible.length > 1 ? 2 : 0
  const slices = visible.map((item, index) => {
    const start = visible.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * circumference, 0)
    const length = (item.value / total) * circumference
    return { dash: Math.max(0, length - gap), item, start }
  })

  return (
    <div className={['flex flex-wrap items-center gap-6', legend === 'below' ? 'flex-col items-start' : ''].join(' ')}>
      <div className="relative shrink-0" style={{ height: size, width: size }}>
        <svg aria-hidden="true" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <g fill="none" strokeWidth={thickness} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke={tokenColor('chart-track')} />
            {slices.map(({ dash, item, start }) => (
              <circle
                cx={size / 2}
                cy={size / 2}
                key={item.name}
                r={radius}
                stroke={tokenColor(item.color)}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-start}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-md text-text-primary">{total}</span>
          {centerLabel ? <span className="helper text-text-tertiary">{centerLabel}</span> : null}
        </div>
      </div>
      <ul className="body m-0 flex min-w-44 flex-1 list-none flex-col gap-2 p-0">
        {data.map((item) => (
          <li className="flex items-center gap-2" key={item.name}>
            <span aria-hidden="true" className="size-2 shrink-0 rounded-pill" style={{ background: tokenColor(item.color) }} />
            <span className="flex-1 text-text-primary">{item.name}</span>
            <span className="num-sm text-text-primary">
              {item.value} · {total === 0 ? 0 : Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
