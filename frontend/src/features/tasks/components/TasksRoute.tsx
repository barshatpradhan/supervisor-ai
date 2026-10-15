import { Navigate, useLocation } from 'react-router-dom'
import { TasksModule } from './TasksModule'

interface TasksRouteLocationState {
  selectedTaskId?: string
}

export function TasksRoute() {
  const location = useLocation()
  const routeState = location.state as TasksRouteLocationState | null

  // Older links pass the task in route state; tasks now have their own page.
  if (routeState?.selectedTaskId) {
    return <Navigate replace to={`/tasks/${routeState.selectedTaskId}`} />
  }

  return <TasksModule />
}
