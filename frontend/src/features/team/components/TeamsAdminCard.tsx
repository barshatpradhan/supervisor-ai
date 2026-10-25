import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { fieldInputClass } from '../../../components/ui/fieldStyles'
import { StateBlock } from '../../../components/ui/StateBlock'
import type { BackendOrganizationTeamSummary } from '../../../types/backend'
import { useOrganizationTeam } from '../hooks/useOrganizationTeam'
import { useOrganizationTeams } from '../hooks/useOrganizationTeams'
import { useTeamAdminActions } from '../hooks/useTeamAdmin'
import { addTeamMember, createTeam, deleteTeam, moveTeamMember, removeTeamMember, updateTeam } from '../services/teamAdminService'
import { deleteBlockReason, memberDisplayName } from '../utils/teamAdminPresentation'
import { ConfirmDialog, MoveMemberDialog, TeamFormDialog } from './TeamDialogs'
import type { LeadOption } from './TeamDialogs'

type Team = BackendOrganizationTeamSummary
type Member = Team['members'][number]

type Open =
  | { kind: 'create' }
  | { kind: 'edit'; team: Team }
  | { kind: 'delete'; team: Team }
  | { kind: 'move'; team: Team; member: Member }
  | { kind: 'remove'; team: Team; member: Member }
  | null

interface TeamsAdminCardProps {
  organizationId: string
  onPeopleChanged?: () => void
}

/** Create, edit and delete teams, set the lead, and add, move or remove members. Admins only. */
export function TeamsAdminCard({ onPeopleChanged, organizationId }: TeamsAdminCardProps) {
  const teamsQuery = useOrganizationTeams(organizationId)
  const membersQuery = useOrganizationTeam(organizationId)
  const { pending, run } = useTeamAdminActions(organizationId, onPeopleChanged)
  const [open, setOpen] = useState<Open>(null)
  const [adding, setAdding] = useState<Record<string, string>>({})

  const teams = teamsQuery.data ?? []
  const members = membersQuery.data ?? []
  const leads: LeadOption[] = members
    .filter((member) => member.status === 'active' && member.role !== 'employee' && member.supervisor_profile_id)
    .map((member) => ({ supervisorId: member.supervisor_profile_id as string, name: memberDisplayName(member) }))
  // People who can join a team: active members in the employee role.
  const employees = members.filter((member) => member.status === 'active' && member.role === 'employee' && member.employee_profile_id)

  const close = () => setOpen(null)
  const closeOnSuccess = (saved: boolean) => {
    if (saved) close()
    return saved
  }

  return (
    <Card aria-labelledby="teams-admin-title" className="flex flex-col gap-4">
      <CardHeader
        action={<Button onClick={() => setOpen({ kind: 'create' })}><Plus aria-hidden="true" className="mr-1.5" size={16} />New team</Button>}
        helper="Teams group people; they don't change who can see tasks, projects or channels"
        id="teams-admin-title"
        title="Manage teams"
      />
      {teamsQuery.isLoading ? <StateBlock compact kind="loading" title="Loading teams" /> : null}
      {teamsQuery.error ? (
        <StateBlock action={<Button onClick={() => { void teamsQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
          Teams could not be loaded.
        </StateBlock>
      ) : null}
      {!teamsQuery.isLoading && !teamsQuery.error && teams.length === 0 ? (
        <StateBlock action={<Button onClick={() => setOpen({ kind: 'create' })} variant="secondary">Create a team</Button>} compact title="No teams yet">
          Create a team to group people and give them a lead.
        </StateBlock>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {teams.map((team) => {
          const blockReason = deleteBlockReason(team)
          const memberIds = new Set(team.members.map((member) => member.employee_id))
          const addable = employees.filter((employee) => !memberIds.has(employee.employee_profile_id as string))
          const addSelectId = `add-${team.id}`
          const deleteReasonId = `delete-reason-${team.id}`
          return (
            <li aria-labelledby={`team-${team.id}`} className="rounded-control border border-chart-grid p-4" key={team.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="body-strong m-0 text-text-primary" id={`team-${team.id}`}>{team.name}</h3>
                  {team.description ? <p className="helper m-0 text-text-tertiary">{team.description}</p> : null}
                  <p className="helper m-0 mt-1 flex items-center gap-2 text-text-secondary">
                    {team.lead ? (
                      <>
                        <Avatar name={team.lead.full_name} size={20} variant={team.lead.avatarVariant} />
                        Led by {team.lead.full_name}
                      </>
                    ) : 'No lead'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-2">
                    <Button aria-label={`Edit ${team.name}`} onClick={() => setOpen({ kind: 'edit', team })} variant="secondary">Edit</Button>
                    <Button
                      aria-describedby={blockReason ? deleteReasonId : undefined}
                      aria-label={`Delete ${team.name}`}
                      disabled={Boolean(blockReason)}
                      onClick={() => setOpen({ kind: 'delete', team })}
                      variant="secondary"
                    >
                      Delete
                    </Button>
                  </div>
                  {blockReason ? <span className="helper text-text-tertiary" id={deleteReasonId}>{blockReason}</span> : null}
                </div>
              </div>

              {team.members.length === 0 ? <p className="helper m-0 mt-3 text-text-tertiary">No members yet.</p> : (
                <ul aria-label={`${team.name} members`} className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                  {team.members.map((member) => (
                    <li className="flex flex-wrap items-center gap-3" key={member.employee_id}>
                      <Avatar name={member.full_name} size={28} variant={member.avatarVariant} />
                      <span className="body min-w-0 flex-1 truncate text-text-primary">
                        {member.full_name}
                        {member.job_title ? <span className="helper ml-2 text-text-tertiary">{member.job_title}</span> : null}
                        {!member.assignable ? <span className="helper ml-2 rounded-pill bg-surface-muted px-2 py-0.5 text-text-secondary">Not assignable</span> : null}
                      </span>
                      {member.assignable ? (
                        <Button aria-label={`Move ${member.full_name} to another team`} onClick={() => setOpen({ kind: 'move', team, member })} variant="ghost">
                          Move…
                        </Button>
                      ) : null}
                      <Button aria-label={`Remove ${member.full_name} from ${team.name}`} onClick={() => setOpen({ kind: 'remove', team, member })} variant="ghost">
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const employeeId = adding[team.id]
                  if (!employeeId || pending) return
                  void run(() => addTeamMember(organizationId, team.id, employeeId), `Added to ${team.name}.`).then((saved) => {
                    if (saved) setAdding((current) => ({ ...current, [team.id]: '' }))
                  })
                }}
              >
                <label className="label flex flex-col gap-1 text-text-secondary" htmlFor={addSelectId}>
                  Add an employee to {team.name}
                  <select
                    className={`${fieldInputClass} min-h-10 w-64 max-w-full`}
                    disabled={addable.length === 0}
                    id={addSelectId}
                    onChange={(event) => setAdding((current) => ({ ...current, [team.id]: event.target.value }))}
                    value={adding[team.id] ?? ''}
                  >
                    <option value="">{addable.length === 0 ? 'Everyone is already here' : 'Choose an employee'}</option>
                    {addable.map((employee) => (
                      <option key={employee.employee_profile_id} value={employee.employee_profile_id as string}>{memberDisplayName(employee)}</option>
                    ))}
                  </select>
                </label>
                <Button disabled={!adding[team.id] || pending} type="submit" variant="secondary">Add</Button>
              </form>
            </li>
          )
        })}
      </ul>

      {open?.kind === 'create' ? (
        <TeamFormDialog
          initial={{ name: '', description: '', leadSupervisorId: null }}
          leads={leads}
          onCancel={close}
          onSubmit={async (values) => closeOnSuccess(await run(
            () => createTeam(organizationId, { name: values.name, description: values.description || undefined, leadSupervisorId: values.leadSupervisorId }),
            `Team ${values.name} created.`,
          ))}
          pending={pending}
          submitLabel="Create team"
          title="New team"
        />
      ) : null}
      {open?.kind === 'edit' ? (
        <TeamFormDialog
          initial={{ name: open.team.name, description: open.team.description ?? '', leadSupervisorId: open.team.lead?.supervisor_id ?? null }}
          leads={leads}
          onCancel={close}
          onSubmit={async (values) => closeOnSuccess(await run(
            () => updateTeam(organizationId, open.team.id, values),
            `Team ${values.name} saved.`,
          ))}
          pending={pending}
          submitLabel="Save"
          title={`Edit ${open.team.name}`}
        />
      ) : null}
      {open?.kind === 'delete' ? (
        <ConfirmDialog
          confirmLabel="Delete team"
          description="The team is removed. People, tasks and projects are not affected."
          onCancel={close}
          onConfirm={async () => closeOnSuccess(await run(() => deleteTeam(organizationId, open.team.id), `Team ${open.team.name} deleted.`))}
          pending={pending}
          title={`Delete ${open.team.name}?`}
        />
      ) : null}
      {open?.kind === 'remove' ? (
        <ConfirmDialog
          confirmLabel="Remove"
          description={`${open.member.full_name} leaves ${open.team.name}. Their tasks and other teams don't change.`}
          onCancel={close}
          onConfirm={async () => closeOnSuccess(await run(
            () => removeTeamMember(organizationId, open.team.id, open.member.employee_id),
            `${open.member.full_name} removed from ${open.team.name}.`,
          ))}
          pending={pending}
          title={`Remove ${open.member.full_name}?`}
        />
      ) : null}
      {open?.kind === 'move' ? (
        <MoveMemberDialog
          fromTeamName={open.team.name}
          memberName={open.member.full_name}
          onCancel={close}
          onMove={async (toTeamId) => closeOnSuccess(await run(
            () => moveTeamMember(organizationId, open.team.id, open.member.employee_id, toTeamId),
            `${open.member.full_name} moved.`,
          ))}
          pending={pending}
          targets={teams
            .filter((team) => team.id !== open.team.id && !team.members.some((member) => member.employee_id === open.member.employee_id))
            .map((team) => ({ id: team.id, name: team.name }))}
        />
      ) : null}
    </Card>
  )
}
