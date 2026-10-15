import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarList } from '../../../components/charts/BarList'
import { ChartCard } from '../../../components/charts/ChartCard'
import { AiNote } from '../../../components/ui/AiNote'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { fieldInputClass } from '../../../components/ui/fieldStyles'
import { PageHeader } from '../../../components/ui/PageHeader'
import { PriorityTag } from '../../../components/ui/PriorityTag'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BackendRecommendation } from '../../../types/backend'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { RecommendationAssignmentDialog } from '../../projects/components/RecommendationAssignmentDialog'
import { useProjectAssignmentTasks } from '../../projects/hooks/useProjectAssignmentTasks'
import { useAiRecommendationManager } from '../hooks/useAiRecommendationManager'
import { RecommendationCard } from './RecommendationCard'

const complexityLabels = { high: 'High complexity', low: 'Low complexity', medium: 'Medium complexity' } as const

const aiIcon = (
  <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-pill bg-ai-bg text-ai-fg">
    <Sparkles size={16} />
  </span>
)

export function AiRecommendationsModule() {
  const manager = useAiRecommendationManager()
  const { activeOrganization } = useOrganization()
  const organizationId = activeOrganization?.id ?? null
  const projectId = manager.selectedProjectId ?? ''
  const tasksQuery = useProjectAssignmentTasks(organizationId, projectId, Boolean(manager.selectedProjectId))
  const [assigning, setAssigning] = useState<BackendRecommendation | null>(null)

  if (manager.isProjectsLoading && !manager.hasProjects) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI recommendations" />
        <Card><StateBlock kind="loading" title="Loading projects" /></Card>
      </div>
    )
  }

  if (manager.projectsError && !manager.hasProjects) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI recommendations" />
        <Card>
          <StateBlock action={<Button onClick={() => { void manager.retryProjects() }} variant="secondary">Retry</Button>} kind="error" title="Projects could not be loaded">
            Check your connection, then try again.
          </StateBlock>
        </Card>
      </div>
    )
  }

  if (!manager.hasProjects) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI recommendations" />
        <Card>
          <StateBlock action={<Link className="label text-text-link" to="/projects">Open projects</Link>} title="No projects yet">
            Create a project and upload its requirements. Recommendations rank employees against that analysis.
          </StateBlock>
        </Card>
      </div>
    )
  }

  const { analysis, selectedProject } = manager
  const cards = manager.recommendationCards
  const isGenerating = manager.generationState.isSubmitting
  const documentsLink = `/projects/${projectId}?tab=documents`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            <label className="sr-only" htmlFor="recommendation-project">Project</label>
            <select
              className={`${fieldInputClass} max-w-72`}
              id="recommendation-project"
              onChange={(event) => manager.selectProject(event.target.value)}
              value={manager.selectedProjectId ?? ''}
            >
              {manager.projectList.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
            <Button
              disabled={!manager.hasAnalysis || isGenerating}
              onClick={() => { void manager.generateRecommendations() }}
              variant={cards.length > 0 ? 'secondary' : 'primary'}
            >
              {isGenerating ? 'Generating…' : cards.length > 0 ? 'Generate again' : 'Generate recommendations'}
            </Button>
          </>
        }
        meta={
          selectedProject ? (
            <>
              <StatusBadge status={selectedProject.status} />
              <PriorityTag priority={selectedProject.priority} />
            </>
          ) : null
        }
        subtitle="Employees ranked against the project's analyzed requirements."
        title="AI recommendations"
      />

      {manager.generationState.error ? (
        <Card>
          <StateBlock compact kind="error" title="Recommendations could not be generated">{manager.generationState.error}</StateBlock>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6 xl:max-w-[400px]">
          <Card aria-labelledby="recommendation-analysis-title" className="flex flex-col gap-4" variant="ai">
            <CardHeader
              action={analysis ? <span className="stat-md text-text-primary">{analysis.estimated_hours}h</span> : null}
              helper={selectedProject?.title}
              icon={aiIcon}
              id="recommendation-analysis-title"
              title="Project analysis"
            />
            {manager.isDocumentsLoading && !analysis ? <StateBlock compact kind="loading" title="Loading analysis" /> : null}
            {!manager.isDocumentsLoading && manager.documentsError ? (
              <StateBlock action={<Button onClick={() => { void manager.retryDocuments() }} variant="secondary">Retry</Button>} compact kind="error">
                The analysis could not be loaded.
              </StateBlock>
            ) : null}
            {!manager.isDocumentsLoading && !manager.documentsError && !analysis ? (
              <StateBlock action={<Link className="label text-text-link" to={documentsLink}>Open project documents</Link>} compact title="Analysis not ready">
                Upload a requirements document for this project. Recommendations need its analysis.
              </StateBlock>
            ) : null}
            {analysis ? (
              <>
                <p className="body m-0 text-text-primary">{analysis.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="ai">{complexityLabels[analysis.complexity]}</Chip>
                </div>
                {[
                  { items: analysis.required_skills, label: 'Required skills', tone: 'ai' as const },
                  { items: analysis.preferred_skills, label: 'Preferred skills', tone: 'neutral' as const },
                  { items: analysis.suggested_roles, label: 'Suggested roles', tone: 'neutral' as const },
                ].map((group) =>
                  group.items.length > 0 ? (
                    <div className="flex flex-col gap-2" key={group.label}>
                      <span className="label text-text-secondary">{group.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => <Chip key={item} tone={group.tone}>{item}</Chip>)}
                      </div>
                    </div>
                  ) : null,
                )}
                <p className="helper m-0 text-text-tertiary">
                  {analysis.provider}{analysis.model ? ` · ${analysis.model}` : ''} · <Link className="text-text-link" to={documentsLink}>View source documents</Link>
                </p>
              </>
            ) : null}
          </Card>

          {cards.length > 0 ? (
            <ChartCard
              helper="Match score out of 100"
              table={{
                columns: [{ key: 'name', label: 'Employee' }, { key: 'score', label: 'Match score' }],
                rows: cards.map((entry) => ({ name: entry.recommendation.fullName, score: Math.round(entry.recommendation.matchScore) })),
              }}
              title="Match scores"
              variant="ai"
            >
              <BarList
                color="chart-ai"
                data={cards.map((entry) => ({ name: entry.recommendation.fullName, value: entry.recommendation.matchScore }))}
                unit=""
              />
            </ChartCard>
          ) : null}
        </div>

        <section aria-labelledby="ranked-title" className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title m-0 text-text-primary" id="ranked-title">Ranked employees</h2>
              <p className="helper m-0 text-text-tertiary">
                {cards.length > 0 ? `${cards.length} ranked in the latest saved run` : 'From the latest saved run'}
                {manager.isRecommendationsRefreshing || manager.isEmployeeDirectoryRefreshing ? ' · Refreshing…' : ''}
              </p>
            </div>
            <AiNote />
          </div>

          {manager.employeeDirectoryError && cards.length > 0 ? (
            <Card padding="sm">
              <StateBlock action={<Button onClick={() => { void manager.retryEmployeeDirectory() }} variant="secondary">Retry</Button>} compact kind="error">
                Live workload and availability could not be loaded. The saved run's values are shown.
              </StateBlock>
            </Card>
          ) : null}

          {manager.isRecommendationsLoading ? <Card><StateBlock kind="loading" title="Loading recommendations" /></Card> : null}

          {!manager.isRecommendationsLoading && manager.recommendationsError ? (
            <Card>
              <StateBlock action={<Button onClick={() => { void manager.retryRecommendations() }} variant="secondary">Retry</Button>} kind="error">
                Saved recommendations could not be loaded.
              </StateBlock>
            </Card>
          ) : null}

          {!manager.isRecommendationsLoading && !manager.recommendationsError && !manager.hasSavedRecommendations ? (
            <Card>
              <StateBlock
                action={
                  manager.hasAnalysis ? (
                    <Button disabled={isGenerating} onClick={() => { void manager.generateRecommendations() }}>
                      {isGenerating ? 'Generating…' : 'Generate recommendations'}
                    </Button>
                  ) : (
                    <Link className="label text-text-link" to={documentsLink}>Open project documents</Link>
                  )
                }
                title={manager.hasAnalysis ? 'No recommendations yet' : 'Analysis required'}
              >
                {manager.hasAnalysis
                  ? 'Generate the first run when you are ready to review who fits this project.'
                  : 'Analyze a requirements document for this project first.'}
              </StateBlock>
            </Card>
          ) : null}

          {!manager.isRecommendationsLoading && !manager.recommendationsError
            ? cards.map((entry) => (
                <RecommendationCard
                  key={entry.recommendation.employeeId}
                  liveMetrics={entry.directoryEmployee}
                  onAssign={manager.recommendationRun && organizationId ? () => setAssigning(entry.recommendation) : undefined}
                  rec={entry.recommendation}
                  showNote={false}
                />
              ))
            : null}
        </section>
      </div>

      {assigning && manager.recommendationRun && organizationId ? (
        <RecommendationAssignmentDialog
          onOpenChange={(open) => {
            if (!open) {
              setAssigning(null)
              void manager.retryRecommendations()
              void manager.retryEmployeeDirectory()
            }
          }}
          open
          organizationId={organizationId}
          projectId={projectId}
          recommendation={assigning}
          recommendationRunId={manager.recommendationRun.recommendationRunId}
          tasks={tasksQuery.data ?? []}
        />
      ) : null}
    </div>
  )
}
