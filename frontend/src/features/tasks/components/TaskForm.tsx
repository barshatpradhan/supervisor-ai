import { useState } from 'react'
import type { FormEvent } from 'react'
import type { BackendProject } from '../../../types/backend'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { TaskFormErrors, TaskFormValues } from '../types/task'
import { taskPriorityOptions } from '../utils/taskPresentation'

interface TaskFormProps {
  formError: string | null
  initialValues: TaskFormValues
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
  projects: BackendProject[]
  validationErrors: TaskFormErrors
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function TaskForm({
  formError,
  initialValues,
  isSubmitting,
  onCancel,
  onSubmit,
  projects,
  validationErrors,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(initialValues)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            New task
          </p>
          <h2 className="text-2xl font-bold text-ink-900">Create task</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            Capture the task scope, project association, and expected effort. You can
            assign or reassign the task after creation from the detail panel.
          </p>
        </div>

        {formError ? <ErrorState message={formError} title="Unable to save task" /> : null}

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Title
            <input
              aria-invalid={validationErrors.title ? 'true' : 'false'}
              className={inputClassName}
              maxLength={160}
              onChange={(event) =>
                setValues((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Add a task title"
              required
              type="text"
              value={values.title}
            />
            {validationErrors.title ? (
              <span className="text-sm font-medium text-danger-700">
                {validationErrors.title}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Project
            <select
              aria-invalid={validationErrors.projectId ? 'true' : 'false'}
              className={inputClassName}
              onChange={(event) =>
                setValues((current) => ({ ...current, projectId: event.target.value }))
              }
              value={values.projectId}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            {validationErrors.projectId ? (
              <span className="text-sm font-medium text-danger-700">
                {validationErrors.projectId}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Description
            <textarea
              className={textAreaClassName}
              maxLength={1200}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Summarize the work, expected outcome, or delivery constraints."
              value={values.description}
            />
            <span className="text-xs font-medium text-ink-500">
              {values.description.length}/1200 characters
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Priority
              <select
                className={inputClassName}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    priority: event.target.value as TaskFormValues['priority'],
                  }))
                }
                value={values.priority}
              >
                {taskPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Estimated hours
              <input
                aria-invalid={validationErrors.estimatedHours ? 'true' : 'false'}
                className={inputClassName}
                min="0.25"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    estimatedHours: event.target.value,
                  }))
                }
                step="0.25"
                type="number"
                value={values.estimatedHours}
              />
              {validationErrors.estimatedHours ? (
                <span className="text-sm font-medium text-danger-700">
                  {validationErrors.estimatedHours}
                </span>
              ) : null}
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
            <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Create task'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}
