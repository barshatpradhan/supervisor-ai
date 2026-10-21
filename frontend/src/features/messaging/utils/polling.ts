/**
 * Polling intervals. Every poll is one API request, and every API request also costs one
 * Supabase Auth call (authenticateUser), so these are kept as slow as feels live.
 * React Query pauses intervals while the tab is hidden (refetchIntervalInBackground: false).
 */
export const THREAD_POLL_ACTIVE_MS = 4_000
export const THREAD_POLL_QUIET_MS = 15_000
/** After this long without any new or changed message, the open thread polls at the quiet rate. */
export const THREAD_QUIET_AFTER_MS = 2 * 60_000
export const UNREAD_POLL_MS = 30_000
export const CONVERSATION_LIST_POLL_MS = 30_000

export function threadPollInterval(lastActivityAt: number, now = Date.now()) {
  return now - lastActivityAt > THREAD_QUIET_AFTER_MS ? THREAD_POLL_QUIET_MS : THREAD_POLL_ACTIVE_MS
}
