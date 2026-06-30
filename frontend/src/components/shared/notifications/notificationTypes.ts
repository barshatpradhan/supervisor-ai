export type NotificationVariant = 'success' | 'error' | 'warning' | 'info'

export interface NotificationInput {
  title: string
  message?: string
  durationMs?: number
  variant: NotificationVariant
}

export interface Notification extends NotificationInput {
  id: string
}

export interface NotificationContextValue {
  notifications: Notification[]
  clear: () => void
  dismiss: (id: string) => void
  error: (input: Omit<NotificationInput, 'variant'>) => void
  info: (input: Omit<NotificationInput, 'variant'>) => void
  success: (input: Omit<NotificationInput, 'variant'>) => void
  warning: (input: Omit<NotificationInput, 'variant'>) => void
}
