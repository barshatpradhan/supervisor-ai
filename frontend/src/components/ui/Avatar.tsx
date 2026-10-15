function getInitials(name: string) {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?').slice(0, 2)
  return initials.toUpperCase()
}

interface AvatarProps {
  name?: string | null
  size?: number
}

/** Initials on a soft tint; with no name, a dashed "Unassigned" placeholder. */
export function Avatar({ name, size = 32 }: AvatarProps) {
  const fontSize = Math.max(10, Math.round(size * 0.36))

  if (!name) {
    return (
      <span
        aria-label="Unassigned"
        className="inline-flex shrink-0 items-center justify-center rounded-pill border border-dashed border-border-strong text-text-tertiary"
        role="img"
        style={{ fontSize, height: size, width: size }}
      >
        ?
      </span>
    )
  }

  return (
    <span
      aria-label={name}
      className="inline-flex shrink-0 items-center justify-center rounded-pill bg-surface-muted font-semibold text-neutral-900"
      role="img"
      style={{ fontSize, height: size, width: size }}
    >
      {getInitials(name)}
    </span>
  )
}
