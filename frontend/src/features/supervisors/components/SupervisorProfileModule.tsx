import type { FormEvent } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { fieldErrorClass, fieldInputClass, fieldLabelClass, fieldTextareaClass } from '../../../components/ui/fieldStyles'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StateBlock } from '../../../components/ui/StateBlock'
import { AvatarPicker } from '../../auth/components/AvatarPicker'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { formatOrganizationRole } from '../../organizations/utils/organizationPresentation'
import { useSupervisorProfileEditor } from '../hooks/useSupervisorProfileEditor'

type SupervisorEditor = ReturnType<typeof useSupervisorProfileEditor>

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

/** Name, department and bio fields, shared by the create and edit states. */
function ProfileFields({ editor }: { editor: SupervisorEditor }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className={fieldLabelClass}>
        Full name
        <input className={fieldInputClass} onChange={(event) => editor.setFullName(event.target.value)} required type="text" value={editor.draft?.fullName ?? ''} />
        {editor.validationErrors.fullName ? <span className={fieldErrorClass}>{editor.validationErrors.fullName}</span> : null}
      </label>
      <label className={fieldLabelClass}>
        Department
        <input className={fieldInputClass} onChange={(event) => editor.setDepartment(event.target.value)} placeholder="Engineering" type="text" value={editor.draft?.department ?? ''} />
      </label>
      <label className={`${fieldLabelClass} md:col-span-2`}>
        Bio
        <textarea
          className={fieldTextareaClass}
          onChange={(event) => editor.setBio(event.target.value)}
          placeholder="What you manage and how your team can reach you."
          value={editor.draft?.bio ?? ''}
        />
      </label>
    </div>
  )
}

export function SupervisorProfileModule() {
  const { user } = useAuth()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const editor = useSupervisorProfileEditor()
  const workspace = activeOrganization?.name ?? 'this workspace'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await editor.saveProfile()
  }

  if (editor.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Profile" />
        <Card><StateBlock kind="loading" title="Loading your profile" /></Card>
      </div>
    )
  }

  if (editor.isMissingProfile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader subtitle={`Add the details your team in ${workspace} will see.`} title="Create your profile" />
        <Card aria-labelledby="create-profile-title" className="flex max-w-3xl flex-col gap-5">
          <CardHeader helper="This profile belongs only to the current workspace." id="create-profile-title" title="Your details" />
          {editor.submitError ? <StateBlock compact kind="error" title="Your profile could not be created">{editor.submitError}</StateBlock> : null}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <ProfileFields editor={editor} />
            <div className="flex justify-end border-t border-chart-grid pt-5">
              <Button disabled={editor.isSaving} type="submit">{editor.isSaving ? 'Creating…' : 'Create profile'}</Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  if (editor.error || !editor.currentProfile || !editor.draft) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Profile" />
        <Card>
          <StateBlock action={<Button onClick={() => { void editor.refetch() }} variant="secondary">Retry</Button>} kind="error" title="Your profile could not be loaded">
            Check your connection, then try again.
          </StateBlock>
        </Card>
      </div>
    )
  }

  const profile = editor.currentProfile

  return (
    <div className="flex flex-col gap-6">
      <PageHeader subtitle={`How your team in ${workspace} sees you.`} title="Profile" />

      <div className="flex flex-wrap items-start gap-6">
        <Card aria-label="Profile summary" className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 xl:max-w-[380px]">
          <div className="flex items-center gap-4">
            <Avatar fallbackKey={user?.id} name={profile.full_name} size={56} variant={user?.avatarVariant} />
            <div className="min-w-0">
              <h2 className="section-title m-0 truncate text-text-primary">{profile.full_name}</h2>
              <p className="body m-0 text-text-secondary">
                {activeMembershipRole ? formatOrganizationRole(activeMembershipRole) : 'Supervisor'}
                {profile.department?.trim() ? ` · ${profile.department}` : ''}
              </p>
              {user?.email ? <p className="helper m-0 truncate text-text-tertiary">{user.email}</p> : null}
            </div>
          </div>
          <p className="body m-0 text-text-primary">{profile.bio?.trim() || 'No bio yet.'}</p>
          <dl className="m-0 grid grid-cols-2 gap-3 rounded-control border border-chart-grid bg-surface-inset p-4">
            <div>
              <dt className="label text-text-secondary">Department</dt>
              <dd className="body m-0 mt-1 text-text-primary">{profile.department?.trim() || 'Not set'}</dd>
            </div>
            <div>
              <dt className="label text-text-secondary">Joined</dt>
              <dd className="num-sm m-0 mt-1.5 text-text-primary">{formatDate(profile.created_at)}</dd>
            </div>
          </dl>
        </Card>

        <Card aria-labelledby="edit-supervisor-title" className="flex min-w-0 flex-[2_1_420px] flex-col gap-5">
          <CardHeader helper="These details can differ between your workspaces." id="edit-supervisor-title" title="Edit profile" />
          {editor.submitError ? <StateBlock compact kind="error" title="Your profile could not be saved">{editor.submitError}</StateBlock> : null}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <ProfileFields editor={editor} />
            <div className="flex flex-col gap-3 border-t border-chart-grid pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span aria-live="polite" className="helper text-text-tertiary">{editor.isDirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button disabled={!editor.isDirty || editor.isSaving} onClick={editor.resetForm} variant="secondary">Discard changes</Button>
                <Button disabled={editor.isSaving || !editor.isDirty} type="submit">{editor.isSaving ? 'Saving…' : 'Save changes'}</Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      <AvatarPicker name={profile.full_name} />
    </div>
  )
}
