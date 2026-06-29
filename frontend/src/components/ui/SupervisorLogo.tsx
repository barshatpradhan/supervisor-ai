interface SupervisorLogoProps {
  className?: string
  compact?: boolean
  inverted?: boolean
}

export function SupervisorLogo({
  className = '',
  compact = false,
  inverted = false,
}: SupervisorLogoProps) {
  const symbolColor = inverted ? '#5B8DF9' : '#2D6FF7'
  const textColor = inverted ? 'text-white' : 'text-ink-900'

  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      <svg
        className="h-[34px] w-[38px] shrink-0"
        viewBox="0 0 100 90"
        role="img"
        aria-label="Supervisor logo symbol"
      >
        <rect x="0" y="0" width="100" height="28" rx="14" fill={symbolColor} />
        <rect
          x="0"
          y="62"
          width="100"
          height="28"
          rx="14"
          fill={symbolColor}
          opacity="0.55"
        />
        <circle cx="38" cy="45" r="13" fill={symbolColor} />
      </svg>
      {!compact ? (
        <span className={`text-xl font-bold leading-none tracking-normal ${textColor}`}>
          Supervisor<span className="text-brand-500">.</span>
        </span>
      ) : null}
    </div>
  )
}
