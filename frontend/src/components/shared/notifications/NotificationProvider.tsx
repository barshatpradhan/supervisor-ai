import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NotificationContext } from './notificationContext'
import type {
  Notification,
  NotificationContextValue,
  NotificationInput,
  NotificationVariant,
} from './notificationTypes'

interface NotificationProviderProps {
  children: ReactNode
}

const defaultDurations: Record<NotificationVariant, number> = {
  success: 4500,
  error: 6500,
  warning: 5500,
  info: 4500,
}

function createNotificationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const timersRef = useRef<Record<string, number>>({})

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))

    const timer = timersRef.current[id]
    if (timer !== undefined) {
      window.clearTimeout(timer)
      delete timersRef.current[id]
    }
  }, [])

  const clear = useCallback(() => {
    setNotifications([])

    for (const timer of Object.values(timersRef.current)) {
      window.clearTimeout(timer)
    }

    timersRef.current = {}
  }, [])

  const show = useCallback(
    ({ durationMs, variant, ...input }: NotificationInput) => {
      const id = createNotificationId()
      const notification: Notification = {
        id,
        durationMs: durationMs ?? defaultDurations[variant],
        variant,
        ...input,
      }

      setNotifications((current) => [notification, ...current].slice(0, 4))

      timersRef.current[id] = window.setTimeout(() => {
        dismiss(id)
      }, notification.durationMs)
    },
    [dismiss],
  )

  useEffect(() => () => clear(), [clear])

  const value = useMemo<NotificationContextValue>(
    () => ({
      clear,
      dismiss,
      error: (input) => show({ ...input, variant: 'error' }),
      info: (input) => show({ ...input, variant: 'info' }),
      notifications,
      success: (input) => show({ ...input, variant: 'success' }),
      warning: (input) => show({ ...input, variant: 'warning' }),
    }),
    [clear, dismiss, notifications, show],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
