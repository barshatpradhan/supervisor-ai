import { useMemo, useState } from 'react'
import type { BackendProject } from '../../../types/backend'
import { useEmployeeProfile } from '../../../hooks/useEmployeeProfile'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useProjects } from '../../projects/hooks/useProjects'
import {
  buildTaskDisplayList,
  buildTaskFormValues,
  buildTaskProgressFormValues,
  createTaskRequestFromValues,
  validateTaskForm,
  validateTaskProgressForm,
} from '../utils/taskPresentation'
import { assignTask, createTask, createTaskProgress } from '../services/taskService'
import { useAssignableEmployees } from './useAssignableEmployees'
import { useTasks } from './useTasks'
import type {
  TaskDisplay,
  TaskFormErrors,
  TaskFormValues,
  TaskProgressFormErrors,
  TaskProgressFormValues,
} from '../types/task'

interface TaskMutationState {
  errors: TaskFormErrors
  formError: string | null
  isSubmitting: boolean
}

interface TaskProgressMutationState {
  errors: TaskProgressFormErrors
  formError: string | null
  isSubmitting: boolean
}

interface TaskAssignmentMutationState {
  formError: string | null
  isSubmitting: boolean
}

interface TaskAssignmentSelectionState {
  employeeId: string
  taskId: string | null
}

function createInitialTaskMutationState(): TaskMutationState {
  return {
    errors: {},
    formError: null,
    isSubmitting: false,
  }
}

function createInitialTaskProgressMutationState(): TaskProgressMutationState {
  return {
    errors: {},
    formError: null,
    isSubmitting: false,
  }
}

function createInitialTaskAssignmentMutationState(): TaskAssignmentMutationState {
  return {
    formError: null,
    isSubmitting: false,
  }
}

export function useTaskManager(initialSelectedTaskId: string | null = null) {
  const notifications = useNotifications()
  const { activeMembershipRole } = useOrganization()
  const canManageTasks =
    activeMembershipRole === 'organization_admin' || activeMembershipRole === 'supervisor'
  const canUpdateProgress = activeMembershipRole === 'employee'
  const tasksQuery = useTasks()
  const projectsQuery = useProjects(canManageTasks)
  const employeeProfileQuery = useEmployeeProfile(canUpdateProgress)
  const [selectedTaskIdState, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId)
  const [panelMode, setPanelMode] = useState<'create' | 'progress' | 'view'>('view')
  const [taskMutationState, setTaskMutationState] = useState<TaskMutationState>(
    createInitialTaskMutationState(),
  )
  const [taskProgressMutationState, setTaskProgressMutationState] =
    useState<TaskProgressMutationState>(createInitialTaskProgressMutationState())
  const [assignmentMutationState, setAssignmentMutationState] =
    useState<TaskAssignmentMutationState>(createInitialTaskAssignmentMutationState())
  const [assignmentSelectionState, setAssignmentSelectionState] =
    useState<TaskAssignmentSelectionState>({
      employeeId: '',
      taskId: null,
    })

  const projectList = useMemo(
    () => (projectsQuery.data ?? []) as BackendProject[],
    [projectsQuery.data],
  )
  const taskList = useMemo(
    () =>
      buildTaskDisplayList(
        tasksQuery.data ?? [],
        canManageTasks ? projectList : null,
        employeeProfileQuery.data,
      ),
    [canManageTasks, employeeProfileQuery.data, projectList, tasksQuery.data],
  )
  const hasTasks = taskList.length > 0
  const selectedTaskId =
    selectedTaskIdState ?? (panelMode === 'view' ? taskList[0]?.id ?? null : null)
  const assignableEmployeesQuery = useAssignableEmployees(canManageTasks && selectedTaskId !== null)
  const selectedTask = useMemo<TaskDisplay | null>(
    () => taskList.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, taskList],
  )
  const isCreateMode = panelMode === 'create'
  const isProgressMode = panelMode === 'progress'
  const isPageLoading =
    tasksQuery.isLoading || (canManageTasks && projectsQuery.isLoading && !projectsQuery.data)
  const pageError = tasksQuery.error ?? (canManageTasks ? projectsQuery.error : null)
  const isRefreshing = tasksQuery.isRefreshing || projectsQuery.isRefreshing

  function clearTaskMutationState() {
    setTaskMutationState(createInitialTaskMutationState())
  }

  function clearTaskProgressMutationState() {
    setTaskProgressMutationState(createInitialTaskProgressMutationState())
  }

  function clearTaskAssignmentMutationState() {
    setAssignmentMutationState(createInitialTaskAssignmentMutationState())
  }

  const assignmentSelection =
    selectedTask && assignmentSelectionState.taskId === selectedTask.id
      ? assignmentSelectionState.employeeId
      : (selectedTask?.assigned_employee_id ?? '')

  function updateAssignmentSelection(employeeId: string) {
    setAssignmentSelectionState({
      employeeId,
      taskId: selectedTask?.id ?? null,
    })

    if (assignmentMutationState.formError) {
      clearTaskAssignmentMutationState()
    }
  }

  function selectTask(taskId: string) {
    setSelectedTaskId(taskId)
    setPanelMode('view')
    setAssignmentSelectionState({
      employeeId: '',
      taskId: null,
    })
    clearTaskMutationState()
    clearTaskProgressMutationState()
    clearTaskAssignmentMutationState()
  }

  function startCreateTask() {
    setPanelMode('create')
    setAssignmentSelectionState({
      employeeId: '',
      taskId: null,
    })
    clearTaskMutationState()
  }

  function startProgressUpdate() {
    if (!selectedTask || !canUpdateProgress) {
      return
    }

    setPanelMode('progress')
    clearTaskProgressMutationState()
  }

  function cancelPanel() {
    setPanelMode('view')
    setAssignmentSelectionState({
      employeeId: '',
      taskId: null,
    })
    clearTaskMutationState()
    clearTaskProgressMutationState()
    clearTaskAssignmentMutationState()
  }

  function retryPage() {
    void tasksQuery.refetch()

    if (canManageTasks) {
      void projectsQuery.refetch()
    }
  }

  async function submitCreateTask(values: TaskFormValues) {
    const errors = validateTaskForm(values)

    if (Object.keys(errors).length > 0) {
      setTaskMutationState({
        errors,
        formError: null,
        isSubmitting: false,
      })
      return
    }

    setTaskMutationState({
      errors: {},
      formError: null,
      isSubmitting: true,
    })

    try {
      const createdTask = await createTask(createTaskRequestFromValues(values))
      await tasksQuery.refetch()
      setSelectedTaskId(createdTask.id)
      setPanelMode('view')
      notifications.success({
        message: 'The task is now available for assignment and progress tracking.',
        title: 'Task created',
      })
      clearTaskMutationState()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to create the task.'

      setTaskMutationState({
        errors: {},
        formError: message,
        isSubmitting: false,
      })
      notifications.error({
        message,
        title: 'Task creation failed',
      })
    }
  }

  async function submitTaskProgress(values: TaskProgressFormValues) {
    if (!selectedTask) {
      return
    }

    const errors = validateTaskProgressForm(values)

    if (Object.keys(errors).length > 0) {
      setTaskProgressMutationState({
        errors,
        formError: null,
        isSubmitting: false,
      })
      return
    }

    setTaskProgressMutationState({
      errors: {},
      formError: null,
      isSubmitting: true,
    })

    try {
      await createTaskProgress(selectedTask.id, {
        notes: values.notes.trim() || undefined,
        progressPercentage: Number(values.progressPercentage),
        status: values.status,
      })
      await tasksQuery.refetch()
      setPanelMode('view')
      notifications.success({
        message: 'Your task progress was saved successfully.',
        title: 'Progress updated',
      })
      clearTaskProgressMutationState()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to update task progress.'

      setTaskProgressMutationState({
        errors: {},
        formError: message,
        isSubmitting: false,
      })
      notifications.error({
        message,
        title: 'Progress update failed',
      })
    }
  }

  const canSubmitAssignment =
    Boolean(selectedTask) &&
    Boolean(assignmentSelection) &&
    assignmentSelection !== (selectedTask?.assigned_employee_id ?? '') &&
    !assignmentMutationState.isSubmitting

  async function submitTaskAssignment() {
    if (!selectedTask || !assignmentSelection) {
      return
    }

    setAssignmentMutationState({
      formError: null,
      isSubmitting: true,
    })

    try {
      await assignTask(selectedTask.id, {
        employeeId: assignmentSelection,
      })
      await Promise.all([tasksQuery.refetch(), assignableEmployeesQuery.refetch()])
      setAssignmentSelectionState({
        employeeId: '',
        taskId: null,
      })
      notifications.success({
        message:
          selectedTask.assigned_employee_id === null
            ? 'The task has been assigned successfully.'
            : 'The task assignment has been updated successfully.',
        title: selectedTask.assigned_employee_id === null ? 'Task assigned' : 'Task reassigned',
      })
      clearTaskAssignmentMutationState()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to update the task assignment.'

      setAssignmentMutationState({
        formError: message,
        isSubmitting: false,
      })
      notifications.error({
        message,
        title: 'Assignment update failed',
      })
    }
  }

  return {
    assignableEmployeesQuery,
    assignmentMutationState,
    assignmentSelection,
    canSubmitAssignment,
    canManageTasks,
    canUpdateProgress,
    cancelPanel,
    hasTasks,
    isCreateMode,
    isPageLoading,
    isProgressMode,
    isRefreshing,
    pageError,
    panelMode,
    projectList,
    retryPage,
    selectTask,
    selectedTask,
    selectedTaskId,
    setAssignmentSelection: updateAssignmentSelection,
    startCreateTask,
    startProgressUpdate,
    submitTaskAssignment,
    submitCreateTask,
    submitTaskProgress,
    taskList,
    taskMutationState,
    taskProgressMutationState,
    getTaskFormValues: (projectId?: string) => buildTaskFormValues(projectId),
    getTaskProgressFormValues: (task: TaskDisplay) => buildTaskProgressFormValues(task),
  }
}
