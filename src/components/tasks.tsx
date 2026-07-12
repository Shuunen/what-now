import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef } from 'react'
import { nbPercentMax, nbRgbMax, sleep } from 'shuutils'
import type { Task } from '../types'
import { logger } from '../utils/logger.utils'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { state } from '../utils/state.utils'
import { isTaskActive, toggleComplete } from '../utils/tasks.utils'
import { CheckmarkIcon } from './icons/checkmark-icon'
import { Button } from './ui/button'

function useConfettiEffects() {
  const fireworksLeftRef = useRef<HTMLAudioElement | null>(null)
  const fireworksRightRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fireworksLeftRef.current = new Audio('/fireworks.mp3')
    fireworksRightRef.current = new Audio('/fireworks.mp3')
  }, [])

  const confettiProbability = 0.7
  const tossCoin = useCallback(() => Math.random() > confettiProbability, [])

  const throwConfetti = useCallback(
    // oxlint-disable-next-line max-params
    async (originX: number, originY: number, angle: number, sound: HTMLAudioElement | null) => {
      void sound?.play()
      // oxlint-disable-next-line id-length
      void confetti({ angle, origin: { x: originX, y: originY } })
      await sleep(nbRgbMax)
    },
    [],
  )

  const throwConfettiAround = useCallback(
    async (element: HTMLElement) => {
      const { bottom, left, right } = element.getBoundingClientRect()
      // oxlint-disable-next-line no-magic-numbers
      const delta = window.innerWidth < 450 ? 90 : 30
      const positionY = Math.round((bottom / window.innerHeight) * nbPercentMax) / nbPercentMax
      let positionX = Math.round(((left + delta) / window.innerWidth) * nbPercentMax) / nbPercentMax
      const angle = 20
      // oxlint-disable-next-line no-magic-numbers
      if (tossCoin()) await throwConfetti(positionX, positionY, 90 + angle, fireworksLeftRef.current)
      positionX = Math.round(((right - delta) / window.innerWidth) * nbPercentMax) / nbPercentMax
      // oxlint-disable-next-line no-magic-numbers
      if (tossCoin()) await throwConfetti(positionX, positionY, 90 - angle, fireworksRightRef.current)
    },
    [throwConfetti, tossCoin],
  )

  return { throwConfettiAround }
}

function renderTask({ accentColor, isActive, onClick, task }: { accentColor: string; isActive: boolean; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; task: Task }) {
  return (
    <Button className={`-ml-2 items-center gap-4 pb-3 pl-2 whitespace-normal transition-transform duration-300 ease-out ${isActive ? '' : 'opacity-60'}`} key={task.id} name={task.name} onClick={onClick} type="button" variant="ghost">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isActive ? 'border-2 border-white/30' : ''}`} style={isActive ? undefined : { background: accentColor }}>
        {!isActive && <CheckmarkIcon />}
      </span>
      <span className={`text-lg leading-none font-medium ${isActive ? '' : 'relative inline-block text-white/50'}`}>
        {task.name}
        {!isActive && <span aria-hidden="true" className="absolute top-1/2 left-0 h-[2.4px] w-full -translate-y-1/2 animate-[wn-strike_0.4s_ease-out_forwards] rounded-sm" style={{ background: accentColor }} />}
      </span>
    </Button>
  )
}

export function Tasks({ tasks }: { tasks: Task[] }) {
  const { throwConfettiAround } = useConfettiEffects()
  const accentColor = progressAccentColor(computeProgressPercent(tasks))

  function onTaskClick(task: Task, event: React.MouseEvent<HTMLButtonElement>) {
    const element = event.currentTarget
    void toggleComplete(task)
    if (!isTaskActive(task)) void throwConfettiAround(element)
    logger.info('task will be updated in state', task)
    // oxlint-disable-next-line react/react-compiler -- state is an external reactive store (shuutils createState), not React state
    state.tasks = state.tasks.map(item => (item.id === task.id ? task : item))
  }

  return (
    <div className="grid gap-2" data-testid="tasks">
      {tasks.map(task => renderTask({ accentColor, isActive: isTaskActive(task), onClick: event => onTaskClick(task, event), task }))}
    </div>
  )
}
