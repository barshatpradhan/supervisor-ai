import { Card } from '../../../components/ui/Card'
import type { Project } from '../types/project'
import { formatProjectDate } from '../utils/projectPresentation'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface ProjectListProps { projects: Project[] }

export function ProjectList({ projects }: ProjectListProps) {
  return <Card className="p-0"><div className="border-b border-border-subtle px-5 py-4"><h2 className="text-lg font-bold text-ink-900">Project list</h2><p className="mt-1 text-sm text-ink-600">Newest projects appear first. Search is limited to this organization’s loaded project list.</p></div><ul className="divide-y divide-border-subtle">{projects.map((project) => <li className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start" key={project.id}><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-ink-900">{project.title}</h3><ProjectStatusBadge kind="status" value={project.status} /><ProjectStatusBadge kind="priority" value={project.priority} /></div><p className="line-clamp-2 text-sm leading-6 text-ink-600" title={project.description ?? undefined}>{project.description?.trim() || 'No project description has been added.'}</p>{project.required_skills.length > 0 ? <p className="text-xs text-ink-500">Required skills: {project.required_skills.join(', ')}</p> : null}</div><dl className="grid grid-cols-2 gap-x-6 text-sm lg:min-w-64 lg:text-right"><div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Created</dt><dd className="mt-1 text-ink-700">{formatProjectDate(project.created_at)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Updated</dt><dd className="mt-1 text-ink-700">{formatProjectDate(project.updated_at)}</dd></div></dl></li>)}</ul></Card>
}
