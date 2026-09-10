import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Project } from '../types/project'

interface DeleteProjectDialogProps {
  error?: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  project: Project | null
}

export function DeleteProjectDialog({
  error,
  isDeleting,
  onCancel,
  onConfirm,
  open,
  project,
}: DeleteProjectDialogProps) {
  if (!project) {
    return null
  }

  return (
    <DialogPrimitive.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
      open={open}
    >
      <Dialog description="This action cannot be undone." title="Delete this project?">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-ink-700">
            Deleting <strong>{project.title}</strong> removes it from your workspace. Documents,
            AI analyses, and recommendations linked to this project will no longer be accessible.
          </p>
          {error ? <ErrorState message={error} title="Unable to delete project" /> : null}
          <div className="flex justify-end gap-3">
            <Button disabled={isDeleting} onClick={onCancel} variant="secondary">
              Cancel
            </Button>
            <Button disabled={isDeleting} onClick={onConfirm} variant="danger">
              {isDeleting ? 'Deleting…' : 'Delete project'}
            </Button>
          </div>
        </div>
      </Dialog>
    </DialogPrimitive.Root>
  )
}
