import confetti from 'canvas-confetti'
import { useCallback, useEffect, useRef } from 'react'
import { nbPercentMax, nbRgbMax, pickOne, sleep } from 'shuutils'
import type { Task } from '../types'
import { logger } from '../utils/logger.utils'
import { state } from '../utils/state.utils'
import { isTaskActive, toggleComplete } from '../utils/tasks.utils'
import { Button } from './ui/button'

const emojis = [
  '👨‍🏫',
  '👩‍🏫',
  '🐱',
  '🥃',
  '🧱',
  '🌁',
  '🌃',
  '🌄',
  '🌅',
  '🌆',
  '🌇',
  '🌉',
  '🏧',
  '🚮',
  '🚰',
  '♿',
  '🚹',
  '🚺',
  '🚻',
  '🚼',
  '🚾',
  '🛂',
  '🛃',
  '🛄',
  '🛅',
  '🔃',
  '🔄',
  '🛐',
  '🕎',
  '🔯',
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
  '⛎',
  '🔀',
  '🔁',
  '🔂',
  '⏩',
  '⏪',
  '🔼',
  '⏫',
  '🔽',
  '⏬',
  '🎦',
  '📶',
  '📳',
  '📴',
  '#️⃣',
  '*️⃣',
  '🔟',
  '🔠',
  '🔡',
  '🔢',
  '🔣',
  '🔤',
  '🆎',
  '🆑',
  '🆒',
  '🆓',
  '🆔',
  '🆕',
  '🆖',
  '🆗',
  '🆘',
  '🆙',
  '🆚',
  '🈁',
  '🈶',
  '🉐',
  '🈹',
  '🈚',
  '🈲',
  '🉑',
  '🈸',
  '🈴',
  '🈳',
  '🈺',
  '🈵',
]

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

export function Tasks({ tasks }: { tasks: Task[] }) {
  const { throwConfettiAround } = useConfettiEffects()

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
      {tasks.map(task => {
        const isActive = isTaskActive(task)
        return (
          <Button
            className={`mr-auto -ml-2 pb-3 pl-2 text-start whitespace-normal transition-transform duration-300 ease-out ${isActive ? '' : 'opacity-60'}`}
            key={task.id}
            name={task.name}
            onClick={event => onTaskClick(task, event)}
            type="button"
            variant="ghost"
          >
            {isActive ? pickOne(emojis) : '✔️'}&nbsp; {task.name}
          </Button>
        )
      })}
    </div>
  )
}
