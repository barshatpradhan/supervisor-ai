import { createContext } from 'react'
import type { NotificationContextValue } from './notificationTypes'

export const NotificationContext = createContext<NotificationContextValue | null>(null)
