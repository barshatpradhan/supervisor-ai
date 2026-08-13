import type { FormEvent } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { ErrorState } from '../../../components/shared/ErrorState'
import { useAuth } from '../../auth/hooks/useAuth'
import { useSupervisorProfileEditor } from '../hooks/useSupervisorProfileEditor'

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function SupervisorProfileModule() {
  const { user } = useAuth()
  const editor = useSupervisorProfileEditor()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await editor.saveProfile()
  }

  if (editor.isLoading) {
    return (
      <Card>
        <p className="text-sm text-ink-600">Loading supervisor profile...</p>
      </Card>
    )
  }

  if (editor.isMissingProfile) {
    return <SupervisorProfileCreation editor={editor} />
  }

  if (editor.error || !editor.currentProfile || !editor.draft) {
    return (
      <ErrorState
        error={editor.error}
        onRetry={() => {
          void editor.refetch()
        }}
        title="Unable to load supervisor profile"
      />
    )
  }

  return (
    <div className="grid gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
          Supervisor workspace
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-ink-900">
          Profile settings
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-ink-600">
          Keep your organization-facing details current so team members know who is
          managing this workspace.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="h-full">
          <div className="flex h-full flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                Supervisor profile
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900">
                {editor.currentProfile.full_name}
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                {user?.email ?? 'No email available'}
                {editor.currentProfile.department
                  ? ` · ${editor.currentProfile.department}`
                  : ''}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted/60 p-4">
              <p className="text-sm font-semibold text-ink-800">Bio</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {editor.currentProfile.bio?.trim() || 'No bio has been added yet.'}
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                <dt className="text-xs font-semibold uppercase tracking-normal text-ink-600">
                  Department
                </dt>
                <dd className="mt-2 text-lg font-bold text-ink-900">
                  {editor.currentProfile.department?.trim() || 'Not specified'}
                </dd>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                <dt className="text-xs font-semibold uppercase tracking-normal text-ink-600">
                  Joined
                </dt>
                <dd className="mt-2 text-lg font-bold text-ink-900">
                  {formatDate(editor.currentProfile.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                Editable details
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink-900">
                Update supervisor profile
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Full name, department, and bio are organization-specific and can vary
                between memberships.
              </p>
            </div>

            {editor.submitError ? (
              <ErrorState message={editor.submitError} title="Unable to save profile" />
            ) : null}

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Full name
              <input
                className={inputClassName}
                onChange={(event) => editor.setFullName(event.target.value)}
                placeholder="Supervisor name"
                type="text"
                value={editor.draft.fullName}
              />
              {editor.validationErrors.fullName ? (
                <span className="text-sm font-medium text-danger-700">
                  {editor.validationErrors.fullName}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Department
              <input
                className={inputClassName}
                onChange={(event) => editor.setDepartment(event.target.value)}
                placeholder="Engineering"
                type="text"
                value={editor.draft.department}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Bio
              <textarea
                className={textAreaClassName}
                onChange={(event) => editor.setBio(event.target.value)}
                placeholder="How should this organization know you?"
                value={editor.draft.bio}
              />
            </label>

            <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-ink-600">
                {editor.isDirty ? 'You have unsaved changes.' : 'All changes are saved.'}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  disabled={!editor.isDirty || editor.isSaving}
                  onClick={editor.resetForm}
                  type="button"
                  variant="secondary"
                >
                  Reset
                </Button>
                <Button disabled={editor.isSaving} type="submit">
                  {editor.isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

function SupervisorProfileCreation({
  editor,
}: {
  editor: ReturnType<typeof useSupervisorProfileEditor>
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await editor.saveProfile()
  }

  return (
    <div className="grid gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
          Supervisor workspace
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-ink-900">Create your profile</h1>
        <p className="max-w-2xl text-sm leading-6 text-ink-600">
          Add the organization-facing details your team will see. This profile belongs only to the
          active organization.
        </p>
      </section>

      <Card className="max-w-2xl">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {editor.submitError ? (
            <ErrorState message={editor.submitError} title="Unable to create supervisor profile" />
          ) : null}
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Full name
            <input
              className={inputClassName}
              onChange={(event) => editor.setFullName(event.target.value)}
              placeholder="Supervisor name"
              required
              type="text"
              value={editor.draft?.fullName ?? ''}
            />
            {editor.validationErrors.fullName ? (
              <span className="text-sm font-medium text-danger-700">
                {editor.validationErrors.fullName}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Department
            <input
              className={inputClassName}
              onChange={(event) => editor.setDepartment(event.target.value)}
              placeholder="Engineering"
              type="text"
              value={editor.draft?.department ?? ''}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Bio
            <textarea
              className={textAreaClassName}
              onChange={(event) => editor.setBio(event.target.value)}
              placeholder="How should this organization know you?"
              value={editor.draft?.bio ?? ''}
            />
          </label>
          <Button disabled={editor.isSaving} type="submit">
            {editor.isSaving ? 'Creating profile...' : 'Create supervisor profile'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
