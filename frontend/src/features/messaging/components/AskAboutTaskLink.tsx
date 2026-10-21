import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProjectChannels } from '../hooks/useMessagingQueries'

interface AskAboutTaskLinkProps {
  organizationId: string | null
  projectId: string
  taskId: string
  taskTitle: string
  className?: string
}

/**
 * "Ask about this task": opens the task's project channel with the task already tagged. Hidden
 * when the caller can't open that channel (for example, after losing their last task there).
 */
export function AskAboutTaskLink({ className = '', organizationId, projectId, taskId, taskTitle }: AskAboutTaskLinkProps) {
  const channels = useProjectChannels(organizationId)
  const conversationId = channels.data?.get(projectId)
  if (!conversationId) return null

  return (
    <Link
      aria-label={`Ask about ${taskTitle} in the project channel`}
      className={[
        'inline-flex items-center gap-1.5 text-sm font-semibold text-text-link no-underline hover:underline',
        className,
      ].join(' ')}
      to={`/messages/${conversationId}?task=${encodeURIComponent(taskId)}`}
    >
      <MessageSquare aria-hidden="true" size={16} />
      Ask about this task
    </Link>
  )
}
