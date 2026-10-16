import type { ColorToken } from './chartColors'
import { tokenColor } from './chartColors'

interface RadialScoreProps {
  color?: ColorToken
  label: string
  size?: number
  sublabel?: string
  thickness?: number
  value: number
}

/** A single percentage as a ring: progress in chart-1, match scores in chart-ai. */
export function RadialScore({ color = 'chart-1', label, size = 120, sublabel, thickness, value }: RadialScoreProps) {
  const stroke = thickness ?? Math.max(5, Math.round(size / 10))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const isLarge = size >= 88

  return (
    <div aria-label={`${label}: ${clamped}%`} className="relative shrink-0" role="img" style={{ height: size, width: size }}>
      <svg aria-hidden="true" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={tokenColor('chart-track')} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
          stroke={tokenColor(color)}
          strokeDasharray={`${(circumference * clamped) / 100} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color: color === 'chart-ai' ? tokenColor('ai-fg') : tokenColor('text-primary') }}
      >
        <span className={isLarge ? 'stat-md' : 'num-sm font-semibold'}>{clamped}%</span>
        {sublabel && isLarge ? <span className="helper text-text-tertiary">{sublabel}</span> : null}
      </span>
    </div>
  )
}
