interface RateLimitNoticeProps {
  /** Seconds left; 0 hides the notice. */
  remainingSeconds: number
  /** The wait announced to screen readers, once, when the notice appears. */
  initialSeconds: number
  /** True after a countdown ended, to announce that the form can be submitted again. */
  finished: boolean
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function describeWait(seconds: number) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 120) return `about ${minutes} minute${minutes === 1 ? '' : 's'}`
  return `about ${Math.round(minutes / 60)} hours`
}

/**
 * Shown after a 429 on an auth form. It says only what the API says: too many attempts, wait this
 * long. Screen readers hear the wait once (role="alert"); the ticking clock beside it is hidden
 * from them so it is not re-read every second.
 */
export function RateLimitNotice({ finished, initialSeconds, remainingSeconds }: RateLimitNoticeProps) {
  if (remainingSeconds <= 0) {
    return finished ? <p className="sr-only" role="status">You can try again now.</p> : null
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-warning-fg/30 bg-warning-bg px-4 py-3 text-sm text-warning-text">
      <p className="m-0" role="alert">
        <span className="font-semibold">Too many attempts.</span> Please wait {describeWait(initialSeconds)} before trying again.
      </p>
      <span aria-hidden="true" className="shrink-0 font-semibold tabular-nums">
        {formatClock(remainingSeconds)}
      </span>
    </div>
  )
}
