import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { useAuth } from '../../auth/hooks/useAuth'
import { EmployeeProfileCard } from './EmployeeProfileCard'
import { EmployeeProfileForm } from './EmployeeProfileForm'
import { EmployeeProfileSkeleton } from './EmployeeProfileSkeleton'
import { EmployeeProfileWorkInfo } from './EmployeeProfileWorkInfo'
import { useEmployeeProfileEditor } from '../hooks/useEmployeeProfileEditor'

export function EmployeeProfileModule() {
  const { user } = useAuth()
  const editor = useEmployeeProfileEditor()

  if (editor.isLoading) {
    return <EmployeeProfileSkeleton />
  }

  if (editor.isMissingProfile) {
    return (
      <EmptyState
        description="Your employee profile is not available yet. Contact your organization if this account should already have an employee record."
        title="Profile not available"
      />
    )
  }

  if (editor.error || !editor.currentProfile) {
    return (
      <ErrorState
        error={editor.error}
        onRetry={() => {
          void editor.refetch()
        }}
        title="Unable to load employee profile"
      />
    )
  }

  return (
    <div className="grid gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-brand-700">
          Employee workspace
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-ink-900">
          Profile settings
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-ink-600">
          Keep your profile details current so your organization can manage
          assignments, workload, and future recommendations accurately.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <EmployeeProfileCard
          email={user?.email ?? null}
          profile={editor.currentProfile}
        />
        <EmployeeProfileWorkInfo profile={editor.currentProfile} />
      </div>

      <EmployeeProfileForm
        approvedSkillCount={editor.approvedSkills.length}
        editor={editor}
      />
    </div>
  )
}
