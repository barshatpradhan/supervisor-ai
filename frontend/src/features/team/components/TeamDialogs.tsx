import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { fieldErrorClass, fieldInputClass, fieldLabelClass, fieldTextareaClass } from '../../../components/ui/fieldStyles'

export interface LeadOption {
  supervisorId: string
  name: string
}

interface TeamFormDialogProps {
  title: string
  submitLabel: string
  initial: { name: string; description: string; leadSupervisorId: string | null }
  leads: LeadOption[]
  pending: boolean
  onCancel: () => void
  onSubmit: (values: { name: string; description: string; leadSupervisorId: string | null }) => Promise<boolean>
}

/** Create or edit a team: name (1-80 characters), description and an optional lead. */
export function TeamFormDialog({ initial, leads, onCancel, onSubmit, pending, submitLabel, title }: TeamFormDialogProps) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [lead, setLead] = useState(initial.leadSupervisorId ?? '')
  const [touched, setTouched] = useState(false)
  const id = useId()
  const trimmed = name.trim()
  const nameError = trimmed.length === 0 ? 'Enter a team name.' : trimmed.length > 80 ? 'Use 80 characters or fewer.' : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (nameError || pending) return
    await onSubmit({ name: trimmed, description: description.trim(), leadSupervisorId: lead || null })
  }

  return (
    <DialogPrimitive.Root onOpenChange={(open) => { if (!open) onCancel() }} open>
      <Dialog title={title}>
        <form className="flex flex-col gap-4" noValidate onSubmit={(event) => { void submit(event) }}>
          <label className={fieldLabelClass} htmlFor={`${id}-name`}>
            Team name
            <input
              aria-describedby={touched && nameError ? `${id}-name-error` : undefined}
              aria-invalid={touched && Boolean(nameError)}
              className={fieldInputClass}
              id={`${id}-name`}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
            {touched && nameError ? <span className={fieldErrorClass} id={`${id}-name-error`} role="alert">{nameError}</span> : null}
          </label>
          <label className={fieldLabelClass} htmlFor={`${id}-description`}>
            Description (optional)
            <textarea className={fieldTextareaClass} id={`${id}-description`} maxLength={500} onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>
          <label className={fieldLabelClass} htmlFor={`${id}-lead`}>
            Lead (optional)
            <select className={fieldInputClass} id={`${id}-lead`} onChange={(event) => setLead(event.target.value)} value={lead}>
              <option value="">No lead</option>
              {leads.map((option) => <option key={option.supervisorId} value={option.supervisorId}>{option.name}</option>)}
            </select>
            <span className="helper text-text-tertiary">Active supervisors, and admins with a supervisor profile.</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button onClick={onCancel} variant="secondary">Cancel</Button>
            <Button disabled={pending} type="submit">{pending ? 'Saving…' : submitLabel}</Button>
          </div>
        </form>
      </Dialog>
    </DialogPrimitive.Root>
  )
}

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => Promise<boolean>
}

export function ConfirmDialog({ confirmLabel, description, onCancel, onConfirm, pending, title }: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={(open) => { if (!open) onCancel() }} open>
      <Dialog description={description} title={title}>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button disabled={pending} onClick={() => { void onConfirm() }} variant="danger">{pending ? 'Working…' : confirmLabel}</Button>
        </div>
      </Dialog>
    </DialogPrimitive.Root>
  )
}

interface MoveMemberDialogProps {
  memberName: string
  fromTeamName: string
  /** Teams the member can move to (not the current one, nor one they are already in). */
  targets: Array<{ id: string; name: string }>
  pending: boolean
  onCancel: () => void
  onMove: (toTeamId: string) => Promise<boolean>
}

/** Move one member to another team in one step: they leave the first team as they join the second. */
export function MoveMemberDialog({ fromTeamName, memberName, onCancel, onMove, pending, targets }: MoveMemberDialogProps) {
  const [target, setTarget] = useState(targets[0]?.id ?? '')
  const id = useId()
  return (
    <DialogPrimitive.Root onOpenChange={(open) => { if (!open) onCancel() }} open>
      <Dialog description={`${memberName} leaves ${fromTeamName} and joins the team you choose, in one step.`} title={`Move ${memberName}`}>
        {targets.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="body m-0 text-text-secondary">There is no other team to move {memberName} to. Create one first.</p>
            <div className="flex justify-end"><Button onClick={onCancel} variant="secondary">Close</Button></div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (target && !pending) void onMove(target) }}>
            <label className={fieldLabelClass} htmlFor={id}>
              Move to
              <select className={fieldInputClass} id={id} onChange={(event) => setTarget(event.target.value)} value={target}>
                {targets.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-3">
              <Button onClick={onCancel} variant="secondary">Cancel</Button>
              <Button disabled={pending || !target} type="submit">{pending ? 'Moving…' : 'Move'}</Button>
            </div>
          </form>
        )}
      </Dialog>
    </DialogPrimitive.Root>
  )
}
