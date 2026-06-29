import { EmptyState } from './EmptyState'

interface PlaceholderScreenProps {
  description: string
  title: string
}

export function PlaceholderScreen({ description, title }: PlaceholderScreenProps) {
  return <EmptyState description={description} title={title} />
}
