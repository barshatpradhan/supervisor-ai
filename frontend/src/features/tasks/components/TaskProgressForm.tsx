import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type {
  TaskDisplay,
  TaskProgressFormErrors,
  TaskProgressFormValues,
} from '../types/task'
import { taskStatusOptions } from '../utils/taskPresentation'

interface TaskProgressFormProps {
  formError: string | null
  initialValues: TaskProgressFormValues
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (values: TaskProgressFormValues) => Promise<void>
  task: TaskDisplay
  validationErrors: TaskProgressFormErrors
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function TaskProgressForm({
  formError,
  initialValues,
  isSubmitting,
  onCancel,
  onSubmit,
  task,
  validationErrors,
}: TaskProgressFormProps) {
  const [values, setValues] = useState<TaskProgressFormValues>(initialValues)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Progress update
          </p>
          <h2 className="text-2xl font-bold text-ink-900">{task.title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            Update your progress percentage, add notes, and move the task status forward.
          </p>
        </div>

        {formError ? (
          <ErrorState message={formError} title="Unable to save progress update" />
        ) : null}

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Progress percentage
              <input
                aria-invalid={validationErrors.progressPercentage ? 'true' : 'false'}
                className={inputClassName}
                max="100"
                min="0"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    progressPercentage: event.target.value,
                  }))
                }
                step="1"
                type="number"
                value={values.progressPercentage}
              />
              {validationErrors.progressPercentage ? (
                <span className="text-sm font-medium text-danger-700">
                  {validationErrors.progressPercentage}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Status
              <select
                className={inputClassName}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    status: event.target.value as TaskProgressFormValues['status'],
                  }))
                }
                value={values.status}
              >
                {taskStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Notes
            <textarea
              className={textAreaClassName}
              maxLength={1200}
              onChange={(event) =>
                setValues((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Share what changed, what is blocked, or what needs review."
              value={values.notes}
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving...' : 'Save progress'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}
