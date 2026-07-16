import { useLocation } from 'react-router-dom'
import { TasksModule } from './TasksModule'

interface TasksRouteLocationState {
  selectedTaskId?: string
}

export function TasksRoute() {
  const location = useLocation()
  const routeState = location.state as TasksRouteLocationState | null

  return <TasksModule initialSelectedTaskId={routeState?.selectedTaskId ?? null} />
}
