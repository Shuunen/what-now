import { checkProp, dateIso10, emit } from '../utils'

export class Task {
  activated = false
  isBonus = false
  isOneTime = false

  /* istanbul ignore next */
  /* eslint-disable-next-line max-params */
  constructor(public id: string, public name: string, public once = 'day', public completedOn = '', public done = false) {
    checkProp('id', this)
    checkProp('name', this)
    this.isBonus = this.once === 'bonus'
    this.isOneTime = this.once === 'yes'
  }

  isActive(): boolean {
    if (this.done || (this.isBonus && !this.activated)) return false
    if (this.completedOn === '' || this.isOneTime || this.activated) return true
    const matches = /(\d)?-?(day|week|month)/.exec(this.once) ?? []
    if (matches.length === 0) {
      console.error('unhandled "once" format, setting task as active by default')
      return true
    }

    const [, numberString = '1', unit] = matches
    const number = Number.parseInt(numberString, 10)
    const days = this.daysSinceCompletion()
    // console.log(`active if days since completion (${days}) superior or equal to ${number} ${unit}(s)`)
    if (unit === 'day') return days >= number
    if (unit === 'week') return days >= number * 7
    return days >= number * 30 // unit === 'month'
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

  toggleComplete() {
    if (this.isActive()) return this.complete()
    this.activated = true
    emit('task-update', this)
  }
}
