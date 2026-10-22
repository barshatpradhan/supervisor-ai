import { AvatarDisc } from './app.ts'

interface PersonAvatarProps {
  name: string
  /** The avatar ID to draw, or null for initials. Pass variantOn(surface, person.avatarVariant). */
  variant: string | null
  size: number
}

/**
 * The app's real Avatar, always static (animated={false}): the app only animates avatars on the
 * profile page and on hover, and a video has no pointer. Initials are keyed by name, as the app's
 * lists key them.
 */
export function PersonAvatar({ name, size, variant }: PersonAvatarProps) {
  return <AvatarDisc animated={false} name={name} size={size} variant={variant} />
}
