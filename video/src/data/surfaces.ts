/**
 * Where the app passes a person's avatarVariant to Avatar, as of main at 7a478c9 (avatar Phase 1:
 * a person's own avatar only). Everywhere else the app draws initials. When Phase 2 ships, flip
 * the matching entries to true; the video then shows faces there with no other change.
 */
export const APP_PASSES_VARIANT = {
  /** Header.tsx: the signed-in viewer's own avatar, 36 px. */
  ownHeader: true,
  /** RecommendationCard.tsx: rendered from the real component, which decides for itself. */
  recommendations: false,
  /** TaskBoard.tsx, 28 px. */
  taskBoard: false,
  /** TeamWorkloadModule.tsx, 32 px. */
  workloadList: false,
  /** MessageItem.tsx senders, 32 px. */
  messageSenders: false,
  /** ConversationList.tsx, 22 px (uses the conversation title). */
  conversationList: false,
} as const

export type Surface = keyof typeof APP_PASSES_VARIANT

/** The variant a surface would show for this person: their ID where the app passes it, else null (initials). */
export function variantOn(surface: Surface, avatarVariant: string | null) {
  return APP_PASSES_VARIANT[surface] ? avatarVariant : null
}

/** Pixel sizes the app uses on each surface. */
export const AVATAR_SIZE: Record<Surface, number> = {
  ownHeader: 36,
  recommendations: 40,
  taskBoard: 28,
  workloadList: 32,
  messageSenders: 32,
  conversationList: 22,
}
