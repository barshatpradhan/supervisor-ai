import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { formatProjectDate, projectPriorityLabels, projectStatusLabels } from '../../projects/utils/projectPresentation'
import { useAiRecommendationManager } from '../hooks/useAiRecommendationManager'
import {
  formatRecommendationEstimatedHours,
  getRecommendationAnalysisSections,
} from '../utils/recommendationPresentation'
import { AiRecommendationResultCard } from './AiRecommendationResultCard'
import { AiRecommendationResultsSkeleton } from './AiRecommendationResultsSkeleton'

function ContextMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-ink-900">{value}</p>
    </div>
  )
}

export function AiRecommendationsModule() {
  const manager = useAiRecommendationManager()
  const navigate = useNavigate()

  if (manager.isProjectsLoading && !manager.hasProjects) {
    return <LoadingState label="Loading recommendation workspace" />
  }

  if (manager.projectsError && !manager.hasProjects) {
    return (
      <ErrorState
        error={manager.projectsError}
        onRetry={() => {
          void manager.retryProjects()
        }}
        title="Unable to load projects"
      />
    )
  }

  if (!manager.hasProjects) {
    return (
      <EmptyState
        actionLabel="Open projects"
        description="Create a project first, then upload a project document so recommendation analysis has real planning context."
        onAction={() => {
          navigate('/projects')
        }}
        title="No projects available for recommendations"
      />
    )
  }

  const selectedProject = manager.selectedProject
  const analysis = manager.analysis

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-ai-fg/20 bg-linear-to-br from-ai-bg via-surface-card to-surface-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-ai-fg/30 bg-ai-bg px-3 py-1 text-xs font-semibold text-ai-text">
              AI review flow
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-normal text-ink-900">
                AI recommendations
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-ink-600">
                AI analyzes project requirements, the backend calculates recommendation scores, and
                the supervisor makes the final assignment decision in the existing Tasks workflow.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-ai-fg/20 bg-surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                Step 1
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">Project analysis context</p>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                Use uploaded document analysis as the project source of truth.
              </p>
            </div>
            <div className="rounded-lg border border-ai-fg/20 bg-surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                Step 2
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">Scored recommendations</p>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                The backend ranks employees from skills, availability, workload, and performance.
              </p>
            </div>
            <div className="rounded-lg border border-ai-fg/20 bg-surface-card p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                Step 3
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">Supervisor decision</p>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                Recommendations inform judgment only. Assignment stays in the real task flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                  Recommendation target
                </p>
                <h2 className="text-lg font-bold text-ink-900">Select project</h2>
                <p className="text-sm leading-6 text-ink-600">
                  Saved recommendation runs and project analysis load for the currently selected
                  project.
                </p>
              </div>
              {manager.isProjectsRefreshing ? (
                <span className="text-sm text-ink-500">Refreshing projects...</span>
              ) : null}
            </div>

            <label className="mt-4 grid gap-2 text-sm font-semibold text-ink-800">
              Project
              <select
                className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition focus:border-primary-600 focus:ring-3 focus:ring-primary-200"
                onChange={(event) => {
                  manager.selectProject(event.target.value)
                }}
                value={manager.selectedProjectId ?? ''}
              >
                {manager.projectList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>

            {selectedProject ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ContextMetric label="Status" value={projectStatusLabels[selectedProject.status]} />
                <ContextMetric
                  label="Priority"
                  value={projectPriorityLabels[selectedProject.priority]}
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                  Analysis context
                </p>
                <h2 className="text-lg font-bold text-ink-900">Project analysis</h2>
                <p className="text-sm leading-6 text-ink-600">
                  Recommendation generation depends on an analyzed project document.
                </p>
              </div>
              {manager.isDocumentsRefreshing ? (
                <span className="text-sm text-ink-500">Refreshing analysis...</span>
              ) : null}
            </div>

            {manager.isDocumentsLoading && !analysis ? (
              <div className="mt-4">
                <LoadingState label="Loading project analysis" />
              </div>
            ) : null}

            {!manager.isDocumentsLoading && manager.documentsError ? (
              <div className="mt-4">
                <ErrorState
                  error={manager.documentsError}
                  onRetry={() => {
                    void manager.retryDocuments()
                  }}
                  title="Unable to load project analysis"
                />
              </div>
            ) : null}

            {!manager.isDocumentsLoading && !manager.documentsError && !analysis ? (
              <div className="mt-4">
                <EmptyState
                  actionLabel="Open project documents"
                  description="Upload and analyze a project document in Projects before generating AI recommendations for this project."
                  onAction={() => {
                    navigate('/projects')
                  }}
                  title="Analysis not ready"
                />
              </div>
            ) : null}

            {analysis ? (
              <div className="mt-4 space-y-5">
                <div className="rounded-lg border border-ai-fg/20 bg-ai-bg/50 p-4">
                  <p className="text-sm font-semibold text-ai-text">Summary</p>
                  <p className="mt-2 break-words text-sm leading-6 text-ink-700">
                    {analysis.summary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <ContextMetric label="Complexity" value={analysis.complexity} />
                  <ContextMetric
                    label="Estimated hours"
                    value={formatRecommendationEstimatedHours(analysis.estimated_hours)}
                  />
                  <ContextMetric label="Provider" value={analysis.provider} />
                  <ContextMetric label="Model" value={analysis.model ?? 'Not specified'} />
                  <ContextMetric label="Created" value={formatProjectDate(analysis.created_at)} />
                </div>

                <div className="grid gap-4">
                  {getRecommendationAnalysisSections(analysis).map((section) => (
                    <div
                      key={section.label}
                      className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                    >
                      <p className="text-sm font-semibold text-ink-900">{section.label}</p>
                      {section.items.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {section.items.map((item) => (
                            <li
                              key={`${section.label}-${item}`}
                              className="rounded-full border border-border-subtle bg-surface-card px-3 py-1 text-sm font-medium text-ink-700"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-ink-600">
                          {section.emptyLabel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                  Recommendation run
                </p>
                <h2 className="text-lg font-bold text-ink-900">Generate or review results</h2>
                <p className="max-w-2xl text-sm leading-6 text-ink-600">
                  Generate a fresh recommendation run for the selected project or review the latest
                  saved run already stored by the backend.
                </p>
              </div>

              <Button
                className="bg-ai-fg text-white hover:bg-ai-text"
                disabled={!manager.hasAnalysis || manager.generationState.isSubmitting}
                onClick={() => {
                  void manager.generateRecommendations()
                }}
              >
                {manager.generationState.isSubmitting
                  ? 'Generating recommendations...'
                  : 'Generate recommendations'}
              </Button>
            </div>

            {manager.generationState.error ? (
              <div
                className="mt-4 rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700"
                role="alert"
              >
                {manager.generationState.error}
              </div>
            ) : null}

            {manager.recommendationRun ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ContextMetric label="Latest run" value={manager.recommendationRun.recommendationRunId} />
                <ContextMetric
                  label="Saved results"
                  value={`${manager.recommendationCards.length} ranked employee${manager.recommendationCards.length === 1 ? '' : 's'}`}
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                  Recommendation results
                </p>
                <h2 className="text-lg font-bold text-ink-900">Employee ranking</h2>
                <p className="text-sm leading-6 text-ink-600">
                  Review saved AI recommendation results before handing off to the task assignment
                  workflow.
                </p>
              </div>
              {manager.isRecommendationsRefreshing ? (
                <span className="text-sm text-ink-500">Refreshing results...</span>
              ) : null}
            </div>

            {manager.isRecommendationsLoading ? (
              <div className="mt-4">
                <AiRecommendationResultsSkeleton />
              </div>
            ) : null}

            {!manager.isRecommendationsLoading && manager.recommendationsError ? (
              <div className="mt-4">
                <ErrorState
                  error={manager.recommendationsError}
                  onRetry={() => {
                    void manager.retryRecommendations()
                  }}
                  title="Unable to load saved recommendations"
                />
              </div>
            ) : null}

            {!manager.isRecommendationsLoading &&
            !manager.recommendationsError &&
            !manager.hasSavedRecommendations ? (
              <div className="mt-4">
                <EmptyState
                  actionLabel={manager.hasAnalysis ? 'Generate recommendations' : 'Open projects'}
                  description={
                    manager.hasAnalysis
                      ? 'No saved recommendation run exists for this project yet. Generate the first run when you are ready to review employee fit.'
                      : 'Recommendation generation is blocked until this project has analyzed document context.'
                  }
                  onAction={() => {
                    if (manager.hasAnalysis) {
                      void manager.generateRecommendations()
                      return
                    }

                    navigate('/projects')
                  }}
                  title={manager.hasAnalysis ? 'No saved recommendations yet' : 'Analysis required'}
                />
              </div>
            ) : null}

            {!manager.isRecommendationsLoading &&
            !manager.recommendationsError &&
            manager.hasSavedRecommendations ? (
              <div className="mt-4 space-y-4">
                {manager.employeeDirectoryError ? (
                  <ErrorState
                    error={manager.employeeDirectoryError}
                    onRetry={() => {
                      void manager.retryEmployeeDirectory()
                    }}
                    title="Unable to refresh live employee metrics"
                  >
                    <p className="mt-2 text-danger-700">
                      Saved recommendation scores are still shown below. Availability, workload, and
                      performance values may be incomplete until the employee directory reloads.
                    </p>
                  </ErrorState>
                ) : null}

                {manager.isEmployeeDirectoryRefreshing ? (
                  <p className="text-sm text-ink-500">Refreshing live employee metrics...</p>
                ) : null}

                <div className="grid gap-4">
                  {manager.recommendationCards.map((entry) => (
                    <AiRecommendationResultCard
                      entry={entry}
                      key={entry.recommendation.employeeId}
                      onOpenTaskAssignment={(employeeId) => {
                        navigate('/tasks', {
                          state: {
                            employeeId,
                            projectId: manager.selectedProjectId,
                            source: 'ai-recommendations',
                          },
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
