import type { BackendOrganizationMembershipRole } from '../../../types/backend'
import type { ConversationMember, MessagingPerson } from '../types/messaging'

const SUGGESTED_ROLES: readonly BackendOrganizationMembershipRole[] = ['organization_admin', 'supervisor']
export const MAX_SUGGESTED_MENTIONS = 3

/**
 * Who to suggest @mentioning when asking about a task in a project channel: the project creator
 * first (if they can still open the channel), then other admins and supervisors, up to three.
 * Suggestions only; nobody is mentioned until the sender picks them.
 */
export function suggestedMentionsFor(
  members: readonly ConversationMember[],
  currentUserId: string | null,
): MessagingPerson[] {
  return members
    .filter((member) => member.userId !== currentUserId && SUGGESTED_ROLES.includes(member.role))
    .sort((left, right) => Number(right.isProjectCreator) - Number(left.isProjectCreator) || left.name.localeCompare(right.name))
    .slice(0, MAX_SUGGESTED_MENTIONS)
    .map(({ name, userId }) => ({ name, userId }))
}
