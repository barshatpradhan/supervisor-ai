import type {
  BackendOrganizationMemberSummary,
  BackendOrganizationTeamSummary,
  BackendRoleChangePreview,
} from '../../../types/backend'

/** Plain-language text for the organization-admin role and team screens. */

export function memberDisplayName(member: BackendOrganizationMemberSummary) {
  return member.supervisor_full_name ?? member.employee_full_name ?? member.email ?? 'Unnamed member'
}

/** Why a member's role can't be changed here, or null when it can. The server enforces the same rules. */
export function roleLockReason(member: BackendOrganizationMemberSummary, activeAdminCount: number) {
  if (member.status === 'invited') return 'Invited: they get a role when they accept.'
  if (member.status === 'suspended') return 'Suspended members can’t change roles.'
  if (member.role === 'organization_admin' && activeAdminCount <= 1) return 'Only admin: make someone else an admin first.'
  return null
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Why the change can't be made, in plain words. */
export function blockedMessage(preview: BackendRoleChangePreview, name: string) {
  switch (preview.blockedReason) {
    case 'last_admin':
      return `${name} is the only active admin. Make someone else an admin first.`
    case 'has_open_tasks':
      return `${name} has ${plural(preview.openTasks, 'open task')}. Reassign ${preview.openTasks === 1 ? 'it' : 'them'} before changing the role.`
    case 'leads_teams':
      return `${name} leads ${preview.teamsLed.join(', ')}. Choose a new lead for ${preview.teamsLed.length === 1 ? 'that team' : 'those teams'} first.`
    case 'member_not_active':
      return 'Only active members can change roles.'
    default:
      return null
  }
}

/** What the change does on their next request. */
export function changeSummary(preview: BackendRoleChangePreview, name: string) {
  const { fromRole, toRole } = preview
  const lines: string[] = []
  if (fromRole === 'employee') {
    lines.push(`${name} leaves the recommendation pool and can't be assigned new tasks.`)
    lines.push('Their "My work" pages close.')
    if (preview.teamsMemberOf.length > 0) {
      lines.push(`They stay listed in ${preview.teamsMemberOf.join(', ')}, marked as not assignable, until they're an employee again.`)
    }
  }
  if (toRole === 'employee') {
    lines.push(`${name} joins the recommendation pool and can be assigned tasks.`)
    lines.push('In messaging they see only the project channels where they have a task, from when they got access.')
  } else if (fromRole === 'employee') {
    lines.push('They see every project channel, with its full history.')
  }
  if (toRole === 'organization_admin') {
    lines.push('They can manage roles, teams and invitations.')
  } else if (fromRole === 'organization_admin') {
    lines.push('They lose the admin pages: team management and invitations.')
  }
  if (toRole === 'employee' && fromRole !== 'employee') {
    lines.push('They lose the supervisor pages, such as projects and AI recommendations.')
  }
  return lines
}

/** What stays, so the change can be undone without losing anything. */
export function keptSummary(preview: BackendRoleChangePreview) {
  const kept = ['Nothing is deleted: everything they created, their messages and their history stay.']
  if (preview.fromRole === 'employee') {
    const parts = [
      preview.completedTasks > 0 ? plural(preview.completedTasks, 'completed task') : null,
      'skills',
      'progress history',
      preview.teamsMemberOf.length > 0 ? 'team memberships' : null,
    ].filter(Boolean)
    kept.push(`Their ${parts.join(', ')} stay with their employee profile and come back if you change the role back.`)
  }
  return kept
}

/** Why a team can't be deleted yet, or null. The server enforces the same rule. */
export function deleteBlockReason(team: BackendOrganizationTeamSummary) {
  const count = team.members.length
  return count > 0 ? `Move or remove its ${count} ${count === 1 ? 'member' : 'members'} first.` : null
}
