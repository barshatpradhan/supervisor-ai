import type { ReactNode } from 'react'
import { getFriendlyApiErrorMessage } from '../../lib/api'
import { Button } from '../ui/Button'

interface ErrorStateProps {
  actionLabel?: string
  children?: ReactNode
  error?: unknown
  message?: string
  onRetry?: () => void
  retryLabel?: string
  title?: string
}

function resolveErrorMessage(error: unknown, message?: string) {
  if (message) {
    return message
  }

  if (error) {
    return getFriendlyApiErrorMessage(error)
  }

  return 'Please try again or contact support if the problem continues.'
}

export function ErrorState({
  actionLabel,
  children,
  error,
  message,
  onRetry,
  retryLabel = 'Try again',
  title = 'Unable to load this section',
}: ErrorStateProps) {
  const resolvedMessage = resolveErrorMessage(error, message)

  return (
    <div
      className="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm"
      role="alert"
    >
      <h2 className="text-base font-semibold text-danger-700">{title}</h2>
      <p className="mt-1 text-danger-700">{resolvedMessage}</p>
      {children}
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} variant="secondary">
          {actionLabel ?? retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
