import { useCallback, useMemo, useState } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { useNotifications } from '../../../hooks/useNotifications'
import { useAuth } from '../../auth/hooks/useAuth'
import { useRecommendationProjects } from './useRecommendationProjects'
import {
  generateRecommendationsForProject,
  getSavedRecommendationsForProject,
  listRecommendationEmployees,
  listRecommendationProjectDocuments,
} from '../services/recommendationService'
import type { RecommendationEmployeeCard, RecommendationRun } from '../types/recommendation'
import {
  buildRecommendationEmployeeCards,
  findRecommendationAnalysis,
} from '../utils/recommendationPresentation'

interface RecommendationGenerationState {
  error: string | null
  isSubmitting: boolean
}

function createInitialGenerationState(): RecommendationGenerationState {
  return {
    error: null,
    isSubmitting: false,
  }
}

export function useAiRecommendationManager() {
  const { role } = useAuth()
  const notifications = useNotifications()
  const canManageRecommendations = role === 'admin' || role === 'supervisor'
  const projectsQuery = useRecommendationProjects(canManageRecommendations)
  const [selectedProjectIdState, setSelectedProjectIdState] = useState<string | null>(null)
  const [generationState, setGenerationState] = useState<RecommendationGenerationState>(
    createInitialGenerationState(),
  )

  const projects = projectsQuery.data ?? []
  const selectedProjectId =
    selectedProjectIdState && projects.some((project) => project.id === selectedProjectIdState)
      ? selectedProjectIdState
      : projects[0]?.id ?? null
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null

  const fetchProjectDocuments = useCallback(() => {
    if (!selectedProjectId) {
      throw new Error('Project id is required.')
    }

    return listRecommendationProjectDocuments(selectedProjectId)
  }, [selectedProjectId])

  const documentsQuery = useApiResource(fetchProjectDocuments, {
    enabled: canManageRecommendations && Boolean(selectedProjectId),
  })

  const fetchSavedRecommendations = useCallback(() => {
    if (!selectedProjectId) {
      throw new Error('Project id is required.')
    }

    return getSavedRecommendationsForProject(selectedProjectId)
  }, [selectedProjectId])

  const savedRecommendationsQuery = useApiResource<RecommendationRun | null>(
    fetchSavedRecommendations,
    {
      enabled: canManageRecommendations && Boolean(selectedProjectId),
    },
  )

  const fetchEmployeeDirectory = useCallback(() => listRecommendationEmployees(), [])
  const employeeDirectoryQuery = useApiResource(fetchEmployeeDirectory, {
    enabled: canManageRecommendations && Boolean(selectedProjectId),
  })

  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data])
  const recommendationRun = savedRecommendationsQuery.data
  const employeeDirectory = useMemo(
    () => employeeDirectoryQuery.data ?? [],
    [employeeDirectoryQuery.data],
  )

  const analysis = useMemo(
    () => findRecommendationAnalysis(documents, recommendationRun?.analysisId),
    [documents, recommendationRun?.analysisId],
  )

  const recommendationCards = useMemo(() => {
    const employeesById = new Map(employeeDirectory.map((employee) => [employee.id, employee]))
    const cards: RecommendationEmployeeCard[] = (recommendationRun?.recommendations ?? []).map(
      (recommendation) => ({
        directoryEmployee: employeesById.get(recommendation.employeeId) ?? null,
        recommendation,
      }),
    )

    return buildRecommendationEmployeeCards(cards)
  }, [employeeDirectory, recommendationRun?.recommendations])

  const hasSavedRecommendations = recommendationRun !== null
  const hasAnalysis = analysis !== null

  function selectProject(projectId: string) {
    setSelectedProjectIdState(projectId)
    setGenerationState(createInitialGenerationState())
  }

  async function generateRecommendations() {
    if (!selectedProjectId || !canManageRecommendations) {
      return
    }

    setGenerationState({
      error: null,
      isSubmitting: true,
    })

    try {
      await generateRecommendationsForProject(selectedProjectId)
      await Promise.all([savedRecommendationsQuery.refetch(), employeeDirectoryQuery.refetch()])
      notifications.success({
        message: 'The latest recommendation run is ready for supervisor review.',
        title: 'Recommendations generated',
      })
      setGenerationState(createInitialGenerationState())
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to generate project recommendations.'

      setGenerationState({
        error: message,
        isSubmitting: false,
      })
      notifications.error({
        message,
        title: 'Recommendation generation failed',
      })
    }
  }

  async function retryProjects() {
    await projectsQuery.refetch()
  }

  async function retryDocuments() {
    await documentsQuery.refetch()
  }

  async function retryRecommendations() {
    await savedRecommendationsQuery.refetch()
  }

  async function retryEmployeeDirectory() {
    await employeeDirectoryQuery.refetch()
  }

  return {
    analysis,
    canManageRecommendations,
    documents,
    documentsError: documentsQuery.error,
    employeeDirectoryError: employeeDirectoryQuery.error,
    generateRecommendations,
    generationState,
    hasAnalysis,
    hasProjects: projects.length > 0,
    hasSavedRecommendations,
    isDocumentsLoading: documentsQuery.isLoading,
    isDocumentsRefreshing: documentsQuery.isRefreshing,
    isEmployeeDirectoryLoading: employeeDirectoryQuery.isLoading,
    isEmployeeDirectoryRefreshing: employeeDirectoryQuery.isRefreshing,
    isProjectsLoading: projectsQuery.isLoading,
    isProjectsRefreshing: projectsQuery.isRefreshing,
    isRecommendationsLoading: savedRecommendationsQuery.isLoading,
    isRecommendationsRefreshing: savedRecommendationsQuery.isRefreshing,
    projectList: projects,
    projectsError: projectsQuery.error,
    recommendationCards,
    recommendationRun,
    recommendationsError: savedRecommendationsQuery.error,
    retryDocuments,
    retryEmployeeDirectory,
    retryProjects,
    retryRecommendations,
    selectProject,
    selectedProject,
    selectedProjectId,
  }
}
