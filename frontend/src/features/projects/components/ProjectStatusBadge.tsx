import type { ProjectPriority, ProjectStatus } from '../types/project'
import {
  getProjectPriorityTone,
  getProjectStatusTone,
  projectPriorityLabels,
  projectStatusLabels,
} from '../utils/projectPresentation'

interface ProjectStatusBadgeProps {
  kind: 'priority' | 'status'
  value: ProjectPriority | ProjectStatus
}

export function ProjectStatusBadge({ kind, value }: ProjectStatusBadgeProps) {
  const label =
    kind === 'status'
      ? projectStatusLabels[value as ProjectStatus]
      : projectPriorityLabels[value as ProjectPriority]
  const tone =
    kind === 'status'
      ? getProjectStatusTone(value as ProjectStatus)
      : getProjectPriorityTone(value as ProjectPriority)

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
