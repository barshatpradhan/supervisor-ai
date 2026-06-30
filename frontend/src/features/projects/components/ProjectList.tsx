import { Card } from '../../../components/ui/Card'
import type { Project } from '../types/project'
import { formatProjectDate } from '../utils/projectPresentation'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface ProjectListProps {
  onSelect: (projectId: string) => void
  projects: Project[]
  selectedProjectId: string | null
}

export function ProjectList({
  onSelect,
  projects,
  selectedProjectId,
}: ProjectListProps) {
  return (
    <Card className="p-0">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-lg font-bold text-ink-900">Project list</h2>
        <p className="mt-1 text-sm text-ink-600">
          Review active, draft, and completed work in one place.
        </p>
      </div>

      <ul className="divide-y divide-border-subtle">
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id

          return (
            <li key={project.id}>
              <button
                className={[
                  'flex w-full flex-col gap-4 px-5 py-4 text-left transition focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-300 sm:flex-row sm:items-start sm:justify-between',
                  isSelected ? 'bg-glass-tinted' : 'hover:bg-surface-muted/80',
                ].join(' ')}
                onClick={() => onSelect(project.id)}
                type="button"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-ink-900">
                      {project.title}
                    </h3>
                    <ProjectStatusBadge kind="status" value={project.status} />
                    <ProjectStatusBadge kind="priority" value={project.priority} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-ink-600">
                    {project.description?.trim() || 'No project description has been added.'}
                  </p>
                </div>

                <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                      Created
                    </dt>
                    <dd className="mt-1 text-ink-700">
                      {formatProjectDate(project.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                      Updated
                    </dt>
                    <dd className="mt-1 text-ink-700">
                      {formatProjectDate(project.updated_at)}
                    </dd>
                  </div>
                </dl>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
