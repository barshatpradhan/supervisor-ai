import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StateBlock } from '../../../components/ui/StateBlock'
import { useAuth } from '../../auth/hooks/useAuth'
import { useEmployeeProfileEditor } from '../hooks/useEmployeeProfileEditor'
import { EmployeeProfileCard } from './EmployeeProfileCard'
import { EmployeeProfileForm } from './EmployeeProfileForm'
import { EmployeeProfileWorkInfo } from './EmployeeProfileWorkInfo'

const subtitle = 'Keep your details current so assignments and recommendations match your skills.'

export function EmployeeProfileModule() {
  const { user } = useAuth()
  const editor = useEmployeeProfileEditor()

  if (editor.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader subtitle={subtitle} title="Profile" />
        <Card><StateBlock kind="loading" title="Loading your profile" /></Card>
      </div>
    )
  }

  if (editor.isMissingProfile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Profile" />
        <Card>
          <StateBlock title="Your profile isn't set up yet">
            Ask your organization admin to finish your employee profile.
          </StateBlock>
        </Card>
      </div>
    )
  }

  if (editor.error || !editor.currentProfile) {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader subtitle={subtitle} title="Profile" />
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <EmployeeProfileCard email={user?.email ?? null} profile={editor.currentProfile} />
        <EmployeeProfileWorkInfo profile={editor.currentProfile} />
      </div>
      <EmployeeProfileForm approvedSkillCount={editor.approvedSkills.length} editor={editor} />
    </div>
  )
}
