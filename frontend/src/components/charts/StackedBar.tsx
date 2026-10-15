import type { Datum } from './chartColors'
import { tokenColor } from './chartColors'

interface StackedBarProps {
  data: Required<Datum>[]
  height?: number
  legend?: boolean
}

/** A one-row mix in a thin strip, with a legend of counts underneath. */
export function StackedBar({ data, height = 10, legend = true }: StackedBarProps) {
  const visible = data.filter((item) => item.value > 0)

  return (
    <div className="flex flex-col gap-2.5">
      <div aria-hidden="true" className="flex gap-0.5 overflow-hidden rounded-pill bg-chart-track" style={{ height }}>
        {visible.map((item) => (
          <div key={item.name} style={{ background: tokenColor(item.color), flex: item.value }} />
        ))}
      </div>
      {legend ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
          {data.map((item) => (
            <li className="label flex items-center gap-1.5 text-text-secondary" key={item.name}>
              <span aria-hidden="true" className="size-2 rounded-pill" style={{ background: tokenColor(item.color) }} />
              {item.name}
              <span className="num-sm text-text-primary">{item.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
