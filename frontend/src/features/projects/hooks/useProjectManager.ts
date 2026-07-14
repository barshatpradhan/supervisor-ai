import { useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { createProject, updateProject } from '../services/projectService'
import { useProjectDocumentManager } from './useProjectDocumentManager'
import { useProject } from './useProject'
import { useProjects } from './useProjects'
import type { Project, ProjectFormErrors, ProjectFormValues, ProjectPanelMode } from '../types/project'
import {
  buildProjectFormValues,
  createProjectRequestFromValues,
  updateProjectRequestFromValues,
  validateProjectForm,
} from '../utils/projectPresentation'

export interface ProjectMutationState {
  errors: ProjectFormErrors
  formError: string | null
  isSubmitting: boolean
}

function createInitialMutationState(): ProjectMutationState {
  return {
    errors: {},
    formError: null,
    isSubmitting: false,
  }
}

export function useProjectManager() {
  const notifications = useNotifications()
  const {
    data: projects,
    error: listError,
    isLoading: isListLoading,
    isRefreshing: isListRefreshing,
    refetch: refetchProjects,
  } = useProjects()
  const [selectedProjectIdState, setSelectedProjectId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<ProjectPanelMode>('view')
  const [mutationState, setMutationState] = useState<ProjectMutationState>(
    createInitialMutationState(),
  )
  const {
    data: selectedProject,
    error: projectError,
    isLoading: isProjectLoading,
    isRefreshing: isProjectRefreshing,
    refetch: refetchProject,
  } = useProject(selectedProjectIdState ?? (panelMode === 'view' ? projects?.[0]?.id : undefined))

  const projectList = projects ?? []
  const hasProjects = projectList.length > 0
  const isCreateMode = panelMode === 'create'
  const isEditMode = panelMode === 'edit'
  const selectedProjectId =
    selectedProjectIdState ?? (panelMode === 'view' ? projectList[0]?.id ?? null : null)
  const isDetailLoading = Boolean(selectedProjectId) && isProjectLoading && !selectedProject
  const documentManager = useProjectDocumentManager(selectedProjectId ?? undefined)

  function clearMutationState() {
    setMutationState(createInitialMutationState())
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setPanelMode('view')
    clearMutationState()
  }

  function startCreateProject() {
    setPanelMode('create')
    setSelectedProjectId(null)
    clearMutationState()
  }

  function startEditProject() {
    if (!selectedProject) {
      return
    }

    setPanelMode('edit')
    clearMutationState()
  }

  function cancelPanel() {
    if (selectedProjectId) {
      setPanelMode('view')
      clearMutationState()
      return
    }

    setPanelMode('view')
    clearMutationState()
  }

  async function submitCreateProject(values: ProjectFormValues) {
    const errors = validateProjectForm(values)

    if (Object.keys(errors).length > 0) {
      setMutationState({
        errors,
        formError: null,
        isSubmitting: false,
      })
      return
    }

    setMutationState({
      errors: {},
      formError: null,
      isSubmitting: true,
    })

    try {
      const createdProject = await createProject(createProjectRequestFromValues(values))
      await refetchProjects()
      setSelectedProjectId(createdProject.id)
      setPanelMode('view')
      notifications.success({
        message: 'The project is now available in your workspace.',
        title: 'Project created',
      })
    } catch (caughtError) {
      setMutationState({
        errors: {},
        formError:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to create the project.',
        isSubmitting: false,
      })
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to create the project.',
        title: 'Project creation failed',
      })
      return
    }

    clearMutationState()
  }

  async function submitUpdateProject(values: ProjectFormValues) {
    if (!selectedProjectId || !selectedProject) {
      return
    }

    const errors = validateProjectForm(values, selectedProject)

    if (Object.keys(errors).length > 0) {
      setMutationState({
        errors,
        formError: null,
        isSubmitting: false,
      })
      return
    }

    const request = updateProjectRequestFromValues(selectedProject, values)

    if (Object.keys(request).length === 0) {
      notifications.info({
        message: 'The project already matches the current values.',
        title: 'No changes to save',
      })
      return
    }

    setMutationState({
      errors: {},
      formError: null,
      isSubmitting: true,
    })

    try {
      await updateProject(selectedProjectId, request)
      await Promise.all([refetchProjects(), refetchProject()])
      setPanelMode('view')
      notifications.success({
        message: 'The project details were updated successfully.',
        title: 'Project updated',
      })
    } catch (caughtError) {
      setMutationState({
        errors: {},
        formError:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to update the project.',
        isSubmitting: false,
      })
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to update the project.',
        title: 'Project update failed',
      })
      return
    }

    clearMutationState()
  }

  function retryList() {
    void refetchProjects()
  }

  function retrySelectedProject() {
    void refetchProject()
  }

  function getProjectFormValues(project?: Project) {
    return buildProjectFormValues(project)
  }

  return {
    cancelPanel,
    getProjectFormValues,
    hasProjects,
    isCreateMode,
    isDetailLoading,
    isEditMode,
    isListLoading,
    isListRefreshing,
    isProjectRefreshing,
    listError,
    mutationState,
    panelMode,
    projectError,
    projectList,
    documentManager,
    retryList,
    retrySelectedProject,
    selectProject,
    selectedProject,
    selectedProjectId,
    startCreateProject,
    startEditProject,
    submitCreateProject,
    submitUpdateProject,
  }
}
