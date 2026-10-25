import { useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { fieldInputClass } from '../../../components/ui/fieldStyles'
import { StateBlock } from '../../../components/ui/StateBlock'
import type { BackendOrganizationMemberSummary, BackendOrganizationMembershipRole } from '../../../types/backend'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { formatOrganizationRole } from '../../organizations/utils/organizationPresentation'
import { useOrganizationTeam } from '../hooks/useOrganizationTeam'
import { useTeamAdminActions } from '../hooks/useTeamAdmin'
import { changeMemberRole } from '../services/teamAdminService'
import { memberDisplayName, roleLockReason } from '../utils/teamAdminPresentation'
import { RoleChangeDialog } from './RoleChangeDialog'

const ROLES: BackendOrganizationMembershipRole[] = ['organization_admin', 'supervisor', 'employee']

interface MemberRolesCardProps {
  organizationId: string
  onPeopleChanged?: () => void
}

/** Every member with a role selector. Organization admins only. */
export function MemberRolesCard({ onPeopleChanged, organizationId }: MemberRolesCardProps) {
  const membersQuery = useOrganizationTeam(organizationId)
  const { activeMembership, refreshOrganizations } = useOrganization()
  const [change, setChange] = useState<{ member: BackendOrganizationMemberSummary; role: BackendOrganizationMembershipRole } | null>(null)
  const { pending, run } = useTeamAdminActions(organizationId, onPeopleChanged)

  const members = membersQuery.data ?? []
  // The signed-in admin's own row, found by their active membership.
  const currentUserId = members.find((member) => member.membership_id === activeMembership?.id)?.user_id ?? null
  const activeAdminCount = members.filter((member) => member.role === 'organization_admin' && member.status === 'active').length

  const confirm = async (fullName: string | undefined) => {
    if (!change) return false
    const name = memberDisplayName(change.member)
    const saved = await run(
      () => changeMemberRole(organizationId, change.member.membership_id, change.role, fullName),
      `${name} is now ${formatOrganizationRole(change.role).toLowerCase()}.`,
    )
    if (saved) {
      // Changing your own role changes what you may see: reload your memberships right away.
      if (change.member.user_id === currentUserId) await refreshOrganizations().catch(() => undefined)
      setChange(null)
    }
    return saved
  }

  return (
    <Card aria-labelledby="member-roles-title" className="flex flex-col gap-4">
      <CardHeader helper="Change who is an admin, supervisor or employee" id="member-roles-title" title="Members and roles" />
      {membersQuery.isLoading ? <StateBlock compact kind="loading" title="Loading members" /> : null}
      {membersQuery.error ? (
        <StateBlock action={<Button onClick={() => { void membersQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
          Members could not be loaded.
        </StateBlock>
      ) : null}
      {!membersQuery.isLoading && !membersQuery.error && members.length === 0 ? <StateBlock compact>No members yet.</StateBlock> : null}

      {members.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {members.map((member) => {
            const name = memberDisplayName(member)
            const lock = roleLockReason(member, activeAdminCount)
            const selectId = `role-${member.membership_id}`
            const reasonId = `${selectId}-reason`
            return (
              <li className="flex flex-wrap items-center gap-3 rounded-control border border-chart-grid p-3" key={member.membership_id}>
                <Avatar name={name} size={32} variant={member.avatarVariant} />
                <div className="min-w-0 flex-1">
                  <p className="body-strong m-0 truncate text-text-primary">
                    {name}
                    {member.user_id === currentUserId ? <span className="helper ml-2 text-text-tertiary">(you)</span> : null}
                  </p>
                  {member.email ? <p className="helper m-0 truncate text-text-tertiary">{member.email}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <label className="sr-only" htmlFor={selectId}>Role for {name}</label>
                  <select
                    aria-describedby={lock ? reasonId : undefined}
                    className={`${fieldInputClass} min-h-10 w-52`}
                    disabled={Boolean(lock) || pending}
                    id={selectId}
                    onChange={(event) => {
                      const role = event.target.value as BackendOrganizationMembershipRole
                      if (role !== member.role) setChange({ member, role })
                    }}
                    value={member.role}
                  >
                    {ROLES.map((role) => <option key={role} value={role}>{formatOrganizationRole(role)}</option>)}
                  </select>
                  {lock ? <span className="helper text-text-tertiary" id={reasonId}>{lock}</span> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {change ? (
        <RoleChangeDialog
          isSelf={change.member.user_id === currentUserId}
          memberName={memberDisplayName(change.member)}
          membershipId={change.member.membership_id}
          onCancel={() => setChange(null)}
          onConfirm={confirm}
          organizationId={organizationId}
          pending={pending}
          targetRole={change.role}
        />
      ) : null}
    </Card>
  )
}
