import { EmptyState } from '../components/shared/EmptyState'

export function ForbiddenPage() {
  return (
    <EmptyState
      description="Your account does not have access to this area."
      title="Access restricted"
    />
  )
}
