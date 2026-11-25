import { useEffect, useState } from 'react'

const refreshMs = 1000

/**
 * The current date, refreshed every second.
 * @returns the current date
 */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), refreshMs)
    return () => clearInterval(interval)
  }, [])
  return now
}
