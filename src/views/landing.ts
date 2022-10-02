import { div, h1, on } from 'shuutils'
import pkg from '../../package.json'
import { credentials } from './credentials'
import { notification } from './notifications'
import { tasks } from './tasks'
import { timer } from './timer'

export const landing = div('landing')

const title = h1('text-5xl sm:text-7xl mb-4 text-blue-300', 'What now')
title.title = `v${pkg.version}`
landing.append(title)
landing.append(notification)
landing.append(timer)

credentials.classList.add('hidden')
landing.append(credentials)
landing.append(tasks)

const showTasks = (sure = false): void => {
  console.log('show tasks', sure)
  credentials.classList.toggle('hidden', sure)
  tasks.classList.toggle('hidden', !sure)
}

on('need-credentials', () => showTasks(false))
on('tasks-loaded', () => showTasks(true))
