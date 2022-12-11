import { div, emit, on, Nb } from 'shuutils'
import type { Task } from '../models'

const timer = div('timer font-thin bottom-8 fixed text-right right-5 text-5xl leading-10 text-gray-700')

let minutes = 0

function updateTimer (): void {
  timer.innerHTML = minutes > 0 ? `${minutes}<br>min` : ''
}

function onTaskLoaded (tasks: Task[]): void {
  console.log('timer, on tasks loaded')
  let seconds = 0
  tasks.forEach(task => {
    if (!task.isActive()) return
    seconds += task.averageTime
  })
  minutes = Math.round(seconds / Nb.SecondsInMinute)
  updateTimer()
}

function onTaskUpdate (task: Task): void {
  console.log('timer, on task update')
  const seconds = (task.isActive() ? Nb.Forward : Nb.Backward) * task.averageTime
  minutes += Math.round(seconds / Nb.SecondsInMinute)
  updateTimer()
}

timer.addEventListener('dblclick', () => emit('dispatch-tasks'))

on('tasks-loaded', onTaskLoaded)
on('task-update', onTaskUpdate)

export { timer }
