import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useId, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { fieldErrorClass, fieldHintClass, fieldInputClass, fieldLabelClass } from '../../../components/ui/fieldStyles'
import { StateBlock } from '../../../components/ui/StateBlock'
import type { BackendOrganizationMembershipRole } from '../../../types/backend'
import { formatOrganizationRole } from '../../organizations/utils/organizationPresentation'
import { useRoleChangePreview } from '../hooks/useTeamAdmin'
import { blockedMessage, changeSummary, keptSummary } from '../utils/teamAdminPresentation'

interface RoleChangeDialogProps {
  organizationId: string
  membershipId: string
  memberName: string
  targetRole: BackendOrganizationMembershipRole
  isSelf: boolean
  pending: boolean
  onCancel: () => void
  /** Called with the name for a new profile when one is needed. Resolves true when saved. */
  onConfirm: (fullName: string | undefined) => Promise<boolean>
}

export function RoleChangeDialog({
  isSelf,
  memberName,
  membershipId,
  onCancel,
  onConfirm,
  organizationId,
  pending,
  targetRole,
}: RoleChangeDialogProps) {
  const preview = useRoleChangePreview(organizationId, membershipId, targetRole)
  // null until the admin types: the field shows the member's other profile name (never their email).
  const [typedName, setTypedName] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const nameId = useId()
  const blockedId = useId()

  const data = preview.data
  const fullName = typedName ?? data?.suggestedName ?? ''
  const blocked = data ? blockedMessage(data, memberName) : null
  const needsName = Boolean(data?.needsProfile)
  const nameMissing = needsName && fullName.trim().length === 0
  const nameTooLong = fullName.trim().length > 120
  const canConfirm = Boolean(data) && !blocked && !data?.unchanged && !nameMissing && !nameTooLong && !pending

  const confirm = async () => {
    setTouched(true)
    if (!canConfirm) return
    await onConfirm(needsName ? fullName.trim() : undefined)
  }

  return (
    <DialogPrimitive.Root onOpenChange={(open) => { if (!open) onCancel() }} open>
      <Dialog
        description={`From ${formatOrganizationRole(data?.fromRole ?? targetRole)} to ${formatOrganizationRole(targetRole)}. It takes effect on their next request.`}
        title={`Change ${memberName}'s role?`}
      >
        <div aria-busy={preview.isLoading} className="flex flex-col gap-5">
          {preview.isLoading ? <StateBlock compact kind="loading" title="Checking what this change affects" /> : null}
          {preview.error ? (
            <StateBlock action={<Button onClick={() => { void preview.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
              Could not check what this change affects.
            </StateBlock>
          ) : null}

          {data ? (
            <>
              {isSelf && data.fromRole === 'organization_admin' && !blocked ? (
                <p className="body m-0 rounded-control bg-warning-bg p-3 text-warning-text" role="note">
                  You are changing your own role. You will lose the admin pages as soon as you confirm.
                </p>
              ) : null}

              <section aria-labelledby={`${nameId}-changes`}>
                <h3 className="label m-0 text-text-secondary" id={`${nameId}-changes`}>What changes</h3>
                <ul className="body m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-text-primary">
                  {changeSummary(data, memberName).map((line) => <li key={line}>{line}</li>)}
                </ul>
              </section>

              <section aria-labelledby={`${nameId}-kept`}>
                <h3 className="label m-0 text-text-secondary" id={`${nameId}-kept`}>What stays</h3>
                <ul className="body m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-text-primary">
                  {keptSummary(data).map((line) => <li key={line}>{line}</li>)}
                </ul>
              </section>

              {needsName && !blocked ? (
                <label className={fieldLabelClass} htmlFor={nameId}>
                  Name for their new {data.needsProfile} profile
                  <input
                    aria-describedby={`${nameId}-hint${touched && (nameMissing || nameTooLong) ? ` ${nameId}-error` : ''}`}
                    aria-invalid={touched && (nameMissing || nameTooLong)}
                    className={fieldInputClass}
                    id={nameId}
                    maxLength={120}
                    onBlur={() => setTouched(true)}
                    onChange={(event) => setTypedName(event.target.value)}
                    required
                    value={fullName}
                  />
                  <span className={fieldHintClass} id={`${nameId}-hint`}>Shown to others in lists and messages. They can change it later.</span>
                  {touched && nameMissing ? <span className={fieldErrorClass} id={`${nameId}-error`} role="alert">Enter a name.</span> : null}
                  {touched && nameTooLong ? <span className={fieldErrorClass} id={`${nameId}-error`} role="alert">Use 120 characters or fewer.</span> : null}
                </label>
              ) : null}

              {blocked ? (
                <p className="body m-0 rounded-control bg-danger-bg p-3 text-danger-fg" id={blockedId} role="alert">
                  {blocked}
                </p>
              ) : null}
              {data.unchanged ? <p className="body m-0 text-text-secondary">{memberName} already has this role.</p> : null}
            </>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={onCancel} variant="secondary">Cancel</Button>
            <Button
              aria-describedby={blocked ? blockedId : undefined}
              disabled={!canConfirm}
              onClick={() => { void confirm() }}
            >
              {pending ? 'Saving…' : `Make ${formatOrganizationRole(targetRole).toLowerCase()}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </DialogPrimitive.Root>
  )
}
