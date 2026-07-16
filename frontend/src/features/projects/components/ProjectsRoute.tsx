import { EmptyState } from '../../../components/shared/EmptyState'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { ProjectsModule } from './ProjectsModule'

export function ProjectsRoute() {
  const { activeRole } = useOrganization()

  if (activeRole !== 'organization_admin' && activeRole !== 'supervisor') {
    return (
      <EmptyState
        description="Project management is currently available only for supervisor and organization admin memberships."
        title="Projects are not available for this role"
      />
    )
  }

  return <ProjectsModule />
}
