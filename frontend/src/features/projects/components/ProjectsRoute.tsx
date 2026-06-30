import { EmptyState } from '../../../components/shared/EmptyState'
import { useAuth } from '../../auth/hooks/useAuth'
import { ProjectsModule } from './ProjectsModule'

export function ProjectsRoute() {
  const { role } = useAuth()

  if (role !== 'admin' && role !== 'supervisor') {
    return (
      <EmptyState
        description="Project management is currently available only for supervisor and admin accounts."
        title="Projects are not available for this role"
      />
    )
  }

  return <ProjectsModule />
}
