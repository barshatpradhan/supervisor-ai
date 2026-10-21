import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Dialog } from '../../../components/ui/Dialog'
import type { MessagingMember } from '../types/messaging'

interface NewDirectMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: MessagingMember[] | undefined
  currentUserId: string | null
  isOpening: boolean
  error: string | null
  onChoose: (userId: string) => void
}

const roleLabels: Record<MessagingMember['role'], string> = {
  employee: 'Employee',
  organization_admin: 'Admin',
  supervisor: 'Supervisor',
}

export function NewDirectMessageDialog({
  currentUserId,
  error,
  isOpening,
  members,
  onChoose,
  onOpenChange,
  open,
}: NewDirectMessageDialogProps) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const people = (members ?? []).filter(
    (member) => member.userId !== currentUserId && (!query || member.name.toLowerCase().includes(query)),
  )

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <Dialog description="Message one member of this organization." title="New direct message">
        <label className="sr-only" htmlFor="new-dm-search">Search members</label>
        <input
          autoFocus
          className="h-10 w-full rounded-control border border-border-strong bg-surface-card px-3 text-sm"
          id="new-dm-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search members"
          value={search}
        />
        {error ? <p className="m-0 mt-2 text-sm text-danger-fg" role="alert">{error}</p> : null}
        {!members ? <p className="m-0 mt-3 text-sm text-text-secondary" role="status">Loading members…</p> : null}
        {members && people.length === 0 ? <p className="m-0 mt-3 text-sm text-text-secondary">No members match.</p> : null}
        <ul className="m-0 mt-3 flex max-h-80 list-none flex-col gap-0.5 overflow-y-auto p-0">
          {people.map((member) => (
            <li key={member.userId}>
              <button
                className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-muted disabled:opacity-60"
                disabled={isOpening}
                onClick={() => onChoose(member.userId)}
                type="button"
              >
                <Avatar name={member.name} size={28} />
                <span className="flex-1 text-sm text-text-primary">{member.name}</span>
                <span className="text-xs text-text-tertiary">{roleLabels[member.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </DialogPrimitive.Root>
  )
}
