import type { InfiniteData } from '@tanstack/react-query'
import type { Message, MessagePage } from '../types/messaging'

export type ThreadData = InfiniteData<MessagePage, string | null>

/**
 * Applies polled or freshly returned messages to the loaded pages: known messages are replaced
 * in place (edits, deletes, reactions), new ones go to the front of the newest page.
 */
export function mergeMessages(data: ThreadData | undefined, incoming: readonly Message[]): ThreadData | undefined {
  if (!data || incoming.length === 0) return data

  const pending = new Map(incoming.map((message) => [message.id, message]))
  const pages = data.pages.map((page) => ({
    ...page,
    messages: page.messages.map((message) => {
      const update = pending.get(message.id)
      if (!update) return message
      pending.delete(message.id)
      // Never let an older copy (from an overlapping poll) overwrite a newer one.
      return Date.parse(update.updatedAt) >= Date.parse(message.updatedAt) ? update : message
    }),
  }))

  if (pending.size > 0 && pages[0]) {
    const added = [...pending.values()].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id),
    )
    pages[0] = { ...pages[0], messages: [...added, ...pages[0].messages] }
  }

  return { ...data, pages }
}

/** Oldest first, for display. */
export function flattenThread(data: ThreadData | undefined) {
  return (data?.pages ?? []).flatMap((page) => page.messages).slice().reverse()
}

export function latestUpdatedAt(data: ThreadData | undefined) {
  let latest: string | null = null
  for (const message of data?.pages.flatMap((page) => page.messages) ?? []) {
    if (!latest || Date.parse(message.updatedAt) > Date.parse(latest)) latest = message.updatedAt
  }
  return latest
}
