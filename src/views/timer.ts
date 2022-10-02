import { div, emit, on } from 'shuutils'
import type { Task } from '../models'

export const timer = div('timer font-thin bottom-4 fixed text-right right-4 text-5xl leading-10 text-gray-700')

let minutes = 0

const updateTimer = (): void => {
  timer.innerHTML = minutes > 0 ? `${minutes}<br>min` : ''
}

const onTaskLoaded = (tasks: Task[]): void => {
  console.log('timer, on tasks loaded')
  let seconds = 0
  tasks.forEach(task => {
    if (!task.isActive()) return
    seconds += task.averageTime
  })
  minutes = Math.round(seconds / 60)
  updateTimer()
}

const onTaskUpdate = (task: Task): void => {
  console.log('timer, on task update')
  const seconds = (task.isActive() ? 1 : -1) * task.averageTime
  minutes += Math.round(seconds / 60)
  updateTimer()
}

timer.addEventListener('dblclick', () => emit('dispatch-tasks'))

on('tasks-loaded', onTaskLoaded)
on('task-update', onTaskUpdate)
