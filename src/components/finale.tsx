import confetti from 'canvas-confetti'
import { useEffect, useRef, useState } from 'react'
import { dateIso10, nbMsInSecond } from 'shuutils'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { isTaskActive } from '../utils/tasks.utils'

const confettiColors = ['#f1c40f', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6', '#1abc9c']
const finaleCelebrationSeconds = 5
const finaleDurationMs = finaleCelebrationSeconds * nbMsInSecond

function burstFinale() {
  // oxlint-disable-next-line id-length
  void confetti({ colors: confettiColors, origin: { y: 0.42 }, particleCount: 150, spread: 115, startVelocity: 48 })
  const end = Date.now() + nbMsInSecond
  function frame() {
    // oxlint-disable-next-line id-length
    void confetti({ angle: 60, colors: confettiColors, origin: { x: 0, y: 0.72 }, particleCount: 7, spread: 72, startVelocity: 52 })
    // oxlint-disable-next-line id-length
    void confetti({ angle: 120, colors: confettiColors, origin: { x: 1, y: 0.72 }, particleCount: 7, spread: 72, startVelocity: 52 })
    if (Date.now() < end) globalThis.requestAnimationFrame(frame)
  }
  frame()
}

export function Finale({ tasks }: { tasks: Task[] }) {
  const [isVisible, setIsVisible] = useState(false)
  const hasCelebratedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined)
  const isAllDone = tasks.length > 0 && tasks.every(task => !isTaskActive(task))

  useEffect(() => {
    audioRef.current = new Audio('/fireworks.mp3')
  }, [])

  function dismiss() {
    setIsVisible(false)
    useAppStore.getState().setFinaleDismissedOn(dateIso10(new Date()))
  }

  useEffect(() => {
    if (!isAllDone) {
      hasCelebratedRef.current = false
      return undefined
    }
    if (hasCelebratedRef.current || useAppStore.getState().data.settings.finaleDismissedOn === dateIso10(new Date())) return undefined
    hasCelebratedRef.current = true
    setIsVisible(true)
    void audioRef.current?.play()
    burstFinale()
    const timeout = setTimeout(dismiss, finaleDurationMs)
    return () => clearTimeout(timeout)
  }, [isAllDone])

  // oxlint-disable-next-line unicorn/no-null
  if (!isVisible || !isAllDone) return null

  return (
    <button
      className="fixed inset-0 z-30 flex animate-in cursor-pointer flex-col items-center justify-center gap-4 bg-black/80 px-5 text-center text-white backdrop-blur-sm duration-400 ease-out zoom-in-90 fade-in"
      data-testid="finale"
      onClick={dismiss}
      type="button"
    >
      <div aria-hidden="true" className="animate-[wn-bloom_0.6s_ease] text-[82px]">
        🎉
      </div>
      <div className="text-3xl font-extrabold">All done!</div>
      <div className="text-base text-white/70 italic">You made it — well done :)</div>
      <div className="mt-1.5 text-xs tracking-widest text-white/40 uppercase">tap to close</div>
    </button>
  )
}
