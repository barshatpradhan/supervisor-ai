import { EmptyState } from '../../../components/shared/EmptyState'
import { useAuth } from '../../auth/hooks/useAuth'
import { AiRecommendationsModule } from './AiRecommendationsModule'

export function AiRecommendationsRoute() {
  const { role } = useAuth()

  if (role !== 'admin' && role !== 'supervisor') {
    return (
      <EmptyState
        description="AI recommendation generation is currently available only for supervisor and admin accounts."
        title="AI recommendations are not available for this role"
      />
    )
  }

  return <AiRecommendationsModule />
}
