import { PriorityTag } from '../../../components/ui/PriorityTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { ProjectPriority, ProjectStatus } from '../types/project'

type ProjectStatusBadgeProps =
  | { kind: 'status'; value: ProjectStatus }
  | { kind: 'priority'; value: ProjectPriority }

/** Project status as a dot-and-word badge, priority as a signal tag. */
export function ProjectStatusBadge(props: ProjectStatusBadgeProps) {
  return props.kind === 'status' ? <StatusBadge status={props.value} /> : <PriorityTag priority={props.value} />
}
