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
  const symbolColor = inverted ? 'var(--color-primary-300)' : 'var(--color-primary-600)'
  const textColor = inverted ? 'text-white' : 'text-ink-900'

  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      <svg
        className="h-[34px] w-[38px] shrink-0"
        viewBox="0 0 100 90"
        role="img"
        aria-label="Supervisor logo symbol"
      >
        <rect x="0" y="0" width="100" height="28" rx="14" style={{ fill: symbolColor }} />
        <rect
          x="0"
          y="62"
          width="100"
          height="28"
          rx="14"
          style={{ fill: symbolColor }}
          opacity="0.55"
        />
        <circle cx="38" cy="45" r="13" style={{ fill: symbolColor }} />
      </svg>
      {!compact ? (
        <span className={`text-xl font-bold leading-none tracking-normal ${textColor}`}>
          Supervisor<span className="text-primary-500">.</span>
        </span>
      ) : null}
    </div>
  )
}
