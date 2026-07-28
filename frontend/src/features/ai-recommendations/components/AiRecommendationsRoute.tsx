import { EmptyState } from '../../../components/shared/EmptyState'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { AiRecommendationsModule } from './AiRecommendationsModule'

export function AiRecommendationsRoute() {
  const { activeMembershipRole } = useOrganization()

  if (
    activeMembershipRole !== 'organization_admin' &&
    activeMembershipRole !== 'supervisor'
  ) {
    return (
      <EmptyState
        description="AI recommendation generation is currently available only for supervisor and organization admin memberships."
        title="AI recommendations are not available for this role"
      />
    )
  }

  return <AiRecommendationsModule />
}
