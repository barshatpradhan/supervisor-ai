import { Avatar as AvatarDisc, type AvatarMotion } from './avatar/Avatar'

interface AvatarProps {
  name?: string | null
  size?: number
  /** Stored avatar ID (users.avatar_variant). Missing or invalid shows initials. */
  variant?: string | null
  /** Stable key for the initials colour (a user ID); defaults to the name. */
  fallbackKey?: string | null
  animated?: boolean | AvatarMotion
}

/**
 * Person or organisation disc: the illustrated avatar when a variant is set, otherwise initials on
 * a colour picked from the name (or fallbackKey). With neither, a dashed "Unassigned" placeholder.
 */
export function Avatar({ name, size = 32, variant, fallbackKey, animated }: AvatarProps) {
  if (!name && !variant) {
    return (
      <span
        aria-label="Unassigned"
        className="inline-flex shrink-0 items-center justify-center rounded-pill border border-dashed border-border-strong text-text-tertiary"
        role="img"
        style={{ fontSize: Math.max(10, Math.round(size * 0.36)), height: size, width: size }}
      >
        ?
      </span>
    )
  }

  return <AvatarDisc animated={animated} fallbackKey={fallbackKey} name={name} size={size} variant={variant} />
}
