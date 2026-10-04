import { daysAgoIso10 as appDaysAgoIso10 } from 'shuutils'
import { daysRecurrence as appDaysRecurrence, isTaskActive as appIsTaskActive, taskMock } from '../src/utils/tasks.utils'
import { byCoachPriority, computeProgressPercent, dateIso10, daysAgoIso10, daysRecurrence, isTaskActive, overdueDays, overdueRatio } from './recurrence'

const onceCases = ['day', 'week', 'month', 'year', '2-days', '3-weeks', '2-months', '10-years', 'yes', 'nonsense']

describe('daysRecurrence', () => {
  it('A matches the app implementation for every rhythm shape', () => {
    for (const once of onceCases) expect(daysRecurrence(once)).toBe(appDaysRecurrence(once))
  })
  it('B converts the common rhythms', () => {
    expect(daysRecurrence('day')).toBe(1)
    expect(daysRecurrence('week')).toBe(7)
    expect(daysRecurrence('2-weeks')).toBe(14)
    expect(daysRecurrence('3-months')).toBe(90)
    expect(daysRecurrence('yes')).toBe(0)
  })
})

describe('daysAgoIso10', () => {
  it('A matches the app implementation', () => {
    for (const days of [0, 1, 7, 30, 365]) expect(daysAgoIso10(days)).toBe(appDaysAgoIso10(days))
  })
  it('B returns an iso10 date', () => {
    expect(dateIso10()).toMatch(/^\d{4}-\d{2}-\d{2}$/u)
  })
})

describe('isTaskActive', () => {
  it('A matches the app implementation across the whole matrix', () => {
    for (const once of onceCases)
      for (const daysAgo of [0, 1, 6, 7, 8, 31, 400]) {
        const task = taskMock({ completedOn: appDaysAgoIso10(daysAgo), once })
        expect(isTaskActive(task)).toBe(appIsTaskActive(task))
        expect(isTaskActive(task, true)).toBe(appIsTaskActive(task, true))
      }
  })
  it('B matches the app implementation for never-completed, done and deleted tasks', () => {
    const cases = [taskMock({ completedOn: '' }), taskMock({ isDone: true }), taskMock({ deletedOn: '2025-01-01T00:00:00.000Z' }), taskMock({ completedOn: '', once: 'yes' })]
    for (const task of cases) expect(isTaskActive(task)).toBe(appIsTaskActive(task))
  })
})

describe('overdueDays', () => {
  it('A is zero for a task due exactly today', () => {
    expect(overdueDays(taskMock({ completedOn: appDaysAgoIso10(7), once: 'week' }))).toBe(0)
  })
  it('B counts days past the rhythm', () => {
    expect(overdueDays(taskMock({ completedOn: appDaysAgoIso10(10), once: 'week' }))).toBe(3)
  })
  it('C never goes negative', () => {
    expect(overdueDays(taskMock({ completedOn: appDaysAgoIso10(1), once: 'week' }))).toBe(0)
  })
  it('D is zero for a never-completed task', () => {
    expect(overdueDays(taskMock({ completedOn: '' }))).toBe(0)
  })
})

describe('overdueRatio', () => {
  it('A ranks lateness relative to the task own rhythm', () => {
    const lateDaily = taskMock({ completedOn: appDaysAgoIso10(4), once: 'day' })
    const lateQuarterly = taskMock({ completedOn: appDaysAgoIso10(93), once: '3-months' })
    expect(overdueRatio(lateDaily)).toBeGreaterThan(overdueRatio(lateQuarterly))
  })
  it('B treats a one-time task as fully due', () => {
    expect(overdueRatio(taskMock({ once: 'yes' }))).toBe(1)
  })
  it('C treats a never-completed task as fully due', () => {
    expect(overdueRatio(taskMock({ completedOn: '' }))).toBe(1)
  })
})

describe('byCoachPriority', () => {
  it('A puts the most overdue first', () => {
    const mild = taskMock({ completedOn: appDaysAgoIso10(8), id: 'mild', once: 'week' })
    const severe = taskMock({ completedOn: appDaysAgoIso10(30), id: 'severe', once: 'week' })
    expect([mild, severe].toSorted(byCoachPriority)[0]?.id).toBe('severe')
  })
  it('B breaks a tie with the quickest task', () => {
    const long = taskMock({ completedOn: appDaysAgoIso10(8), id: 'long', minutes: 60, once: 'week' })
    const quick = taskMock({ completedOn: appDaysAgoIso10(8), id: 'quick', minutes: 5, once: 'week' })
    expect([long, quick].toSorted(byCoachPriority)[0]?.id).toBe('quick')
  })
  it('C prefers a task that already carries a reason', () => {
    const bare = taskMock({ completedOn: appDaysAgoIso10(8), id: 'bare', minutes: 5, once: 'week' })
    const motivated = taskMock({ completedOn: appDaysAgoIso10(8), id: 'motivated', minutes: 5, once: 'week', reason: 'it matters' })
    expect([bare, motivated].toSorted(byCoachPriority)[0]?.id).toBe('motivated')
  })
})

describe('computeProgressPercent', () => {
  it('A is zero when nothing is on today plate', () => {
    expect(computeProgressPercent([])).toBe(0)
  })
  it('B counts only today tasks, not the whole list', () => {
    const dueToday = taskMock({ completedOn: appDaysAgoIso10(2), id: 'due', once: 'day' })
    const doneToday = taskMock({ completedOn: appDaysAgoIso10(0), id: 'done', once: 'day' })
    const notDueForMonths = taskMock({ completedOn: appDaysAgoIso10(1), id: 'later', once: 'year' })
    expect(computeProgressPercent([dueToday, doneToday, notDueForMonths])).toBe(50)
  })
  it('C is a hundred when every task of the day is done', () => {
    expect(computeProgressPercent([taskMock({ completedOn: appDaysAgoIso10(0), once: 'day' })])).toBe(100)
  })
})
