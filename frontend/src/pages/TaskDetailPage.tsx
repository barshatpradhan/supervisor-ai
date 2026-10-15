import { useParams } from 'react-router-dom'
import { TaskDetailModule } from '../features/tasks/components/TaskDetailModule'

export function TaskDetailPage() {
  const { taskId } = useParams()
  // Remount per task so selection and form state start fresh.
  return <TaskDetailModule key={taskId} />
}
