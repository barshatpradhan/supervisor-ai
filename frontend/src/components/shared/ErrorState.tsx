interface ErrorStateProps {
  message?: string
  title?: string
}

export function ErrorState({
  message = 'Please try again or contact support if the problem continues.',
  title = 'Unable to load this section',
}: ErrorStateProps) {
  return (
    <div
      className="rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm"
      role="alert"
    >
      <h2 className="text-base font-semibold text-danger-700">{title}</h2>
      <p className="mt-1 text-danger-700">{message}</p>
    </div>
  )
}
