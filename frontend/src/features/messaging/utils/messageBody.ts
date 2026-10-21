import type { MessagingPerson } from '../types/messaging'

/** Mentions travel as <@user-uuid> tokens. Text is always rendered as React text, never as HTML. */
const MENTION_TOKEN = /<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>/gi

export const MESSAGE_MAX_LENGTH = 4000

export type BodySegment = { type: 'text'; text: string } | { type: 'mention'; userId: string; name: string }

export function splitMessageBody(body: string, people: readonly MessagingPerson[]): BodySegment[] {
  const names = new Map(people.map((person) => [person.userId.toLowerCase(), person.name]))
  const segments: BodySegment[] = []
  let lastIndex = 0

  for (const match of body.matchAll(MENTION_TOKEN)) {
    const index = match.index ?? 0
    if (index > lastIndex) segments.push({ type: 'text', text: body.slice(lastIndex, index) })
    const userId = match[1].toLowerCase()
    segments.push({ type: 'mention', userId, name: names.get(userId) ?? 'someone' })
    lastIndex = index + match[0].length
  }

  if (lastIndex < body.length) segments.push({ type: 'text', text: body.slice(lastIndex) })
  return segments
}

/** Body text as the composer shows it: tokens become "@Name". */
export function bodyToDraft(body: string, people: readonly MessagingPerson[]) {
  return splitMessageBody(body, people)
    .map((segment) => (segment.type === 'text' ? segment.text : `@${segment.name}`))
    .join('')
}

/**
 * Turns "@Name" for each person picked from the mention list back into tokens. Longest names
 * first, so "@Ann Lee" is not partly matched by "@Ann".
 */
export function draftToBody(draft: string, mentioned: readonly MessagingPerson[]) {
  return [...mentioned]
    .sort((left, right) => right.name.length - left.name.length)
    .reduce((text, person) => text.split(`@${person.name}`).join(`<@${person.userId}>`), draft)
    .trim()
}

/** The "@query" being typed just before the caret, if any. */
export function activeMentionQuery(draft: string, caret: number) {
  const match = /(^|\s)@([^\s@]{0,30})$/.exec(draft.slice(0, caret))
  return match ? { query: match[2], start: caret - match[2].length - 1 } : null
}
