import { Button } from '../../ui/Button'
import { useNotifications } from '../../../hooks/useNotifications'
import type { NotificationVariant } from './notificationTypes'

const variantClasses: Record<NotificationVariant, string> = {
  success: 'border-success-fg bg-success-bg text-success-text',
  error: 'border-danger-600 bg-danger-50 text-danger-700',
  warning: 'border-warning-fg bg-warning-bg text-warning-text',
  info: 'border-info-fg bg-info-bg text-info-text',
}

function NotificationIcon({ variant }: { variant: NotificationVariant }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
        variant === 'success'
          ? 'bg-success-fg'
          : variant === 'error'
            ? 'bg-danger-600'
            : variant === 'warning'
              ? 'bg-warning-fg'
              : 'bg-info-fg',
      ].join(' ')}
    />
  )
}

export function NotificationViewport() {
  const { dismiss, notifications } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(92vw,22rem)] gap-3"
    >
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className={[
            'pointer-events-auto rounded-lg border p-4 shadow-shell backdrop-blur-md',
            variantClasses[notification.variant],
          ].join(' ')}
          role={notification.variant === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-start gap-3">
            <NotificationIcon variant={notification.variant} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{notification.title}</h2>
              {notification.message ? (
                <p className="mt-1 text-sm opacity-90">{notification.message}</p>
              ) : null}
            </div>
            <Button
              aria-label="Dismiss notification"
              className="h-8 min-h-8 w-8 px-0 text-current hover:bg-black/5"
              onClick={() => dismiss(notification.id)}
              variant="ghost"
            >
              ×
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}
