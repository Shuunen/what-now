import { useEffect, useState } from 'react'
import { dateIso10 } from 'shuutils'

const refreshMs = 30_000

/**
 * Today's date as YYYY-MM-DD, kept up to date while the page stays open.
 * The tasks of the day depend on it, so a screen left on past midnight, like an Echo Show, recomputes them when the day changes.
 * It only re-renders its component when the day actually changes.
 * @returns today's date, iso 10 format
 */
export function useDayKey() {
  const [day, setDay] = useState(() => dateIso10(new Date()))
  useEffect(() => {
    const interval = setInterval(() => setDay(dateIso10(new Date())), refreshMs)
    return () => clearInterval(interval)
  }, [])
  return day
}
