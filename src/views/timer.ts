import { on } from 'shuutils'
import { Task } from '../models'
import { div } from '../utils'

export const timer = div('timer font-thin bottom-4 fixed right-4 text-6xl text-gray-700')

let minutes = 0

const updateTimer = () => {
  timer.textContent = minutes > 0 ? `${minutes}min` : ''
}

const onTaskLoaded = (tasks: Task[]) => {
  let seconds = 0
  tasks.forEach(task => {
    if (!task.isActive()) return
    seconds += task.averageTime
  })
  minutes = Math.round(seconds / 60)
  updateTimer()
}

const onTaskUpdate = (task: Task) => {
  const seconds = (task.isActive() ? 1 : -1) * task.averageTime
  minutes += Math.round(seconds / 60)
  updateTimer()
}

on('tasks-loaded', onTaskLoaded)
on('task-update', onTaskUpdate)
