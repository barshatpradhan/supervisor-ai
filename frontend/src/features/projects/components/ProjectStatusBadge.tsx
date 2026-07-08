import type { ProjectPriority, ProjectStatus } from '../types/project'
import {
  getProjectPriorityTone,
  getProjectStatusTone,
  projectPriorityLabels,
  projectStatusLabels,
} from '../utils/projectPresentation'

type ProjectStatusBadgeProps =
  | {
      kind: 'status'
      value: ProjectStatus
    }
  | {
      kind: 'priority'
      value: ProjectPriority
    }

export function ProjectStatusBadge({ kind, value }: ProjectStatusBadgeProps) {
  const label = kind === 'status' ? projectStatusLabels[value] : projectPriorityLabels[value]
  const tone = kind === 'status' ? getProjectStatusTone(value) : getProjectPriorityTone(value)

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
