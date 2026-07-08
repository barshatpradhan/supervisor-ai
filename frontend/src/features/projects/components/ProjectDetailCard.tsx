import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import type { Project } from '../types/project'
import { formatProjectDate } from '../utils/projectPresentation'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface ProjectDetailCardProps {
  onEdit: () => void
  project: Project
}

export function ProjectDetailCard({ onEdit, project }: ProjectDetailCardProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Project details
            </p>
            <h2 className="text-2xl font-bold text-ink-900">{project.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge kind="status" value={project.status} />
              <ProjectStatusBadge kind="priority" value={project.priority} />
            </div>
          </div>
          <Button onClick={onEdit} variant="secondary">
            Edit project
          </Button>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
          <p className="text-sm font-semibold text-ink-900">Description</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {project.description?.trim() || 'No description has been added for this project.'}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <p className="text-sm font-semibold text-ink-900">Required skills</p>
            {project.required_skills.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {project.required_skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full border border-border-subtle bg-surface-card px-3 py-1.5 text-sm font-medium text-ink-700"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-ink-600">
                This project does not have any required skills recorded yet.
              </p>
            )}
          </div>

          <dl className="grid gap-3">
            <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                Status
              </dt>
              <dd className="mt-2">
                <ProjectStatusBadge kind="status" value={project.status} />
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                Priority
              </dt>
              <dd className="mt-2">
                <ProjectStatusBadge kind="priority" value={project.priority} />
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                Created
              </dt>
              <dd className="mt-2 text-sm font-medium text-ink-800">
                {formatProjectDate(project.created_at)}
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
              <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                Last updated
              </dt>
              <dd className="mt-2 text-sm font-medium text-ink-800">
                {formatProjectDate(project.updated_at)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  )
}
