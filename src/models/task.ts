import { dateIso10, daysAgoIso10, emit } from 'shuutils'
import { numbers } from '../utils'

type Second = number

export class Task {

  public readonly id: string

  public readonly name: string

  public readonly once: string

  public completedOn: string

  public readonly averageTime: Second

  public isActivated = false

  private readonly isBonus: boolean

  private readonly isOneTime: boolean

  public isDone = false

  /* istanbul ignore next */
  /* eslint-disable-next-line max-params */
  public constructor (id: string, name: string, once = 'day', completedOn = '', averageTime: Second = 0) {
    this.id = id
    this.name = name
    this.once = once
    this.completedOn = completedOn
    this.averageTime = averageTime
    this.isBonus = this.once === 'bonus'
    this.isOneTime = this.once === 'yes'
  }

  public isActive (): boolean {
    if (this.isDone || (this.isBonus && !this.isActivated)) return false
    if (this.completedOn === '' || this.isOneTime || this.isActivated) return true
    const recurrence = this.daysRecurrence()
    const days = this.daysSinceCompletion()
    return days >= recurrence
  }

  public daysRecurrence (): number {
    const matches = /(\d+)?-?(day|month|week)/u.exec(this.once) ?? []
    if (matches.length === 0) return 0
    const [, numberString = '1', unit] = matches
    const number = Number.parseInt(numberString, 10)
    if (unit === 'day') return number
    if (unit === 'week') return number * numbers.daysInWeek
    return number * numbers.daysInMonth // unit === 'month'
  }

  public daysSinceCompletion (): number {
    if (this.completedOn === '') return 0
    const today = dateIso10(new Date())
    return ((new Date(today).getTime() - new Date(this.completedOn).getTime()) / numbers.dayInMs)
  }

  public complete (): void {
    const today = dateIso10(new Date())
    this.completedOn = today // task is complete for today
    this.isDone = this.isOneTime // but it also can be done totally if it was a one time job
    this.isActivated = false
    emit('task-update', this)
  }

  private unComplete (): void {
    // to un-complete, need to put the last completed on just before the required number of days
    this.completedOn = daysAgoIso10(this.daysRecurrence())
    this.isDone = false
    this.isActivated = true
    emit('task-update', this)
  }

  public toggleComplete (): void {
    if (this.isActive()) this.complete()
    else this.unComplete()
  }
}
