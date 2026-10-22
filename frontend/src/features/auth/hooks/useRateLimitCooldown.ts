import { useCallback, useEffect, useState } from 'react'

/**
 * A countdown started from a 429's Retry-After. While it runs the form's submit button stays
 * disabled; `finished` turns true once it ends so the form can announce that trying again is OK.
 */
export function useRateLimitCooldown() {
  const [until, setUntil] = useState<number | null>(null)
  const [initialSeconds, setInitialSeconds] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (until === null) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) {
        setUntil(null)
        setFinished(true)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])

  const start = useCallback((seconds: number) => {
    const current = Date.now()
    setInitialSeconds(seconds)
    setNow(current)
    setFinished(false)
    setUntil(current + seconds * 1000)
  }, [])

  const remainingSeconds = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000))

  return { finished, initialSeconds, isCoolingDown: remainingSeconds > 0, remainingSeconds, start }
}
