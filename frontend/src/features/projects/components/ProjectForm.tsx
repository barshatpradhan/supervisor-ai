import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Project, ProjectFormErrors, ProjectFormValues } from '../types/project'
import { projectPriorityOptions } from '../utils/projectPresentation'

interface ProjectFormProps {
  formError: string | null
  initialValues: ProjectFormValues
  isSubmitting: boolean
  mode: 'create' | 'edit'
  onCancel?: () => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
  project?: Project
  validationErrors: ProjectFormErrors
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function ProjectForm({
  formError,
  initialValues,
  isSubmitting,
  mode,
  onCancel,
  onSubmit,
  project,
  validationErrors,
}: ProjectFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-brand-700">
            {mode === 'create' ? 'New project' : 'Edit project'}
          </p>
          <h2 className="text-2xl font-bold text-ink-900">
            {mode === 'create' ? 'Create project' : `Update ${project?.title ?? 'project'}`}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            Capture the core project details now. Status remains managed by the
            existing backend defaults and workflows.
          </p>
        </div>

        {formError ? (
          <ErrorState message={formError} title="Unable to save project" />
        ) : null}

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Title
            <input
              className={inputClassName}
              maxLength={160}
              onChange={(event) =>
                setValues((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Add a project title"
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
            Description
            <textarea
              className={textAreaClassName}
              maxLength={1200}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Summarize the project scope, objectives, or delivery constraints."
              value={values.description}
            />
            <span className="text-xs font-medium text-ink-500">
              {values.description.length}/1200 characters
            </span>
            {validationErrors.description ? (
              <span className="text-sm font-medium text-danger-700">
                {validationErrors.description}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Priority
            <select
              className={inputClassName}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  priority: event.target.value as ProjectFormValues['priority'],
                }))
              }
              value={values.priority}
            >
              {projectPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
                Cancel
              </Button>
            ) : null}
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create project'
                  : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}
