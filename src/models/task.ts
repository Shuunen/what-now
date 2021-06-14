import { dateIso10, daysAgoIso10, emit } from 'shuutils'

type Second = number

export class Task {
  activated = false
  isBonus = false
  isOneTime = false
  done = false

  /* istanbul ignore next */
  /* eslint-disable-next-line max-params */
  constructor(public id: string, public name: string, public once = 'day', public completedOn = '', public averageTime: Second = 0) {
    this.isBonus = this.once === 'bonus'
    this.isOneTime = this.once === 'yes'
  }

  isActive(): boolean {
    if (this.done || (this.isBonus && !this.activated)) return false
    if (this.completedOn === '' || this.isOneTime || this.activated) return true
    const recurrence = this.daysRecurrence()
    const days = this.daysSinceCompletion()
    return days >= recurrence
  }

  daysRecurrence(): number {
    const matches = /(\d+)?-?(day|week|month)/.exec(this.once) ?? []
    if (matches.length === 0) return 0
    const [, numberString = '1', unit] = matches
    const number = Number.parseInt(numberString, 10)
    if (unit === 'day') return number
    if (unit === 'week') return number * 7
    return number * 30 // unit === 'month'
  }

  daysSinceCompletion(): number {
    if (this.completedOn === '') return 0
    const today = dateIso10(new Date())
    return ((new Date(today).getTime() - new Date(this.completedOn).getTime()) / 1000 / (3600 * 24))
  }

  complete() {
    const today = dateIso10(new Date())
    this.completedOn = today // task is complete for today
    this.done = this.isOneTime // but it also can be done totally if it was a one time job
    this.activated = false
    emit('task-update', this)
  }

  unComplete() {
    // to un-complete, need to put the last completed on just before the required number of days
    this.completedOn = daysAgoIso10(this.daysRecurrence())
    this.done = false
    this.activated = true
    emit('task-update', this)
  }

  toggleComplete() {
    return this.isActive() ? this.complete() : this.unComplete()
  }
}
