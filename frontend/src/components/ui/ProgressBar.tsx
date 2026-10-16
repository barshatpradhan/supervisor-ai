type ProgressTone = 'primary' | 'good' | 'bad' | 'neutral' | 'ai'

const toneClasses: Record<ProgressTone, string> = {
  ai: 'bg-chart-ai',
  bad: 'bg-danger-fg',
  good: 'bg-success-fg',
  neutral: 'bg-chart-4',
  primary: 'bg-chart-1',
}

interface ProgressBarProps {
  label: string
  showValue?: boolean
  size?: 'md' | 'sm'
  tone?: ProgressTone
  value: number
}

export function ProgressBar({ label, showValue = true, size = 'md', tone = 'primary', value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className="flex items-center gap-3">
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className={`flex-1 overflow-hidden rounded-pill bg-chart-track ${size === 'sm' ? 'h-1.5' : 'h-2'}`}
        role="progressbar"
      >
        <div className={`h-full rounded-pill transition-[width] duration-700 ease-out motion-reduce:transition-none ${toneClasses[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
      {showValue ? <span className="num-sm w-10 text-right text-text-primary">{clamped}%</span> : null}
    </div>
  )
}
