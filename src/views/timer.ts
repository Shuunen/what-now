import { on } from 'shuutils'
import { Task } from '../models'
import { div } from '../utils'

export const timer = div('timer font-thin bottom-4 fixed right-4 text-6xl text-gray-700')

const onTaskLoaded = (tasks: Task[]) => {
  let seconds = 0
  tasks.forEach(task => {
    if (!task.isActive()) return
    seconds += task.averageTime
  })
  const minutes = Math.round(seconds / 60)
  timer.textContent = minutes > 0 ? `${minutes}min` : ''
}

on('tasks-loaded', onTaskLoaded)
