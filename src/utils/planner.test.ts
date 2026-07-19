import type { Task } from '../schemas/task'
import {
  allDayIndices,
  anchoredCompletedOn,
  canMoveTaskEarlier,
  computeTaskModifications,
  createTaskDistribution,
  dayNames,
  daysInWeek,
  daysToFrequencyString,
  frequencyLabel,
  getEffectiveRecurrence,
  getHigherFrequency,
  getLowerFrequency,
  getQuoteModifiedTaskIds,
  getTaskColor,
  getTaskDaysWithModifications,
  type TaskModifications,
  validFrequencies,
} from './planner.utils'
import * as tasksUtils from './tasks.utils'

vi.mock(import('./tasks.utils'))

const mockTask: Task = {
  completedOn: '2023-01-01T10:00:00Z',
  createdOn: '2023-01-01T10:00:00Z',
  id: 'task-1',
  isDone: false,
  minutes: 30,
  name: 'Test Task',
  once: 'week',
  updatedOn: '',
}

const emptyModifications: TaskModifications = { completedOn: {}, fields: {}, frequency: {} }

describe('planner utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock current date for consistent testing
    vi.setSystemTime(new Date('2023-01-08T10:00:00Z')) // Sunday
  })

  it('dayNames A should contain the seven weekday names indexed by getDay', () => {
    expect(dayNames).toMatchSnapshot()
  })

  it('daysInWeek A should equal 14', () => {
    expect(daysInWeek).toBe(14)
  })

  it('allDayIndices A should contain indices for all days', () => {
    expect(allDayIndices).toMatchSnapshot()
  })

  it('validFrequencies A should be in ascending order', () => {
    expect(validFrequencies).toMatchSnapshot()
  })

  it('daysToFrequencyString A should convert 1 to day', () => {
    expect(daysToFrequencyString(1)).toBe('day')
  })

  it('daysToFrequencyString B should convert 7 to week', () => {
    expect(daysToFrequencyString(7)).toBe('week')
  })

  it('daysToFrequencyString C should convert 14 to 2-weeks', () => {
    expect(daysToFrequencyString(14)).toBe('2-weeks')
  })

  it('daysToFrequencyString D should convert 21 to 3-weeks', () => {
    expect(daysToFrequencyString(21)).toBe('3-weeks')
  })

  it('daysToFrequencyString E should convert 28 to 4-weeks', () => {
    expect(daysToFrequencyString(28)).toBe('4-weeks')
  })

  it('daysToFrequencyString F should convert other numbers to X-days format', () => {
    expect(daysToFrequencyString(5)).toBe('5-days')
  })

  it('frequencyLabel A should label a single day as daily', () => {
    vi.mocked(tasksUtils.parseOnce).mockReturnValue({ quantity: 1, unit: 'day' })
    expect(frequencyLabel('day')).toBe('daily')
  })

  it('frequencyLabel B should label a single week as weekly', () => {
    vi.mocked(tasksUtils.parseOnce).mockReturnValue({ quantity: 1, unit: 'week' })
    expect(frequencyLabel('week')).toBe('weekly')
  })

  it('frequencyLabel C should label a single month as monthly', () => {
    vi.mocked(tasksUtils.parseOnce).mockReturnValue({ quantity: 1, unit: 'month' })
    expect(frequencyLabel('month')).toBe('monthly')
  })

  it('frequencyLabel D should label a single year as yearly', () => {
    vi.mocked(tasksUtils.parseOnce).mockReturnValue({ quantity: 1, unit: 'year' })
    expect(frequencyLabel('year')).toBe('yearly')
  })

  it('frequencyLabel E should pluralize multiple units', () => {
    vi.mocked(tasksUtils.parseOnce).mockReturnValue({ quantity: 2, unit: 'week' })
    expect(frequencyLabel('2-weeks')).toBe('2 weeks')
  })

  it('getHigherFrequency A should return lower number for higher frequency', () => {
    expect(getHigherFrequency(7)).toBe(6)
  })

  it('getHigherFrequency B should return undefined for daily frequency', () => {
    expect(getHigherFrequency(1)).toBeUndefined()
  })

  it('getHigherFrequency C should return undefined for invalid frequency', () => {
    expect(getHigherFrequency(10)).toBeUndefined()
  })

  it('getLowerFrequency A should return higher number for lower frequency', () => {
    expect(getLowerFrequency(7)).toBe(14)
  })

  it('getLowerFrequency B should return undefined for monthly frequency', () => {
    expect(getLowerFrequency(28)).toBeUndefined()
  })

  it('getLowerFrequency C should return undefined for invalid frequency', () => {
    expect(getLowerFrequency(10)).toBeUndefined()
  })

  it('getEffectiveRecurrence A should return modification when present', () => {
    const modifications = { 'task-1': '2-weeks' }
    vi.mocked(tasksUtils.daysRecurrence).mockImplementation(once => (once === '2-weeks' ? 14 : 7))
    expect(getEffectiveRecurrence(mockTask, modifications)).toBe(14)
  })

  it('getEffectiveRecurrence B should return original recurrence when no modification', () => {
    const modifications = {}
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    expect(getEffectiveRecurrence(mockTask, modifications)).toBe(7)
  })

  it('getTaskColor A should return red for daily tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(1)
    expect(getTaskColor(mockTask)).toContain('bg-red-900/10')
  })

  it('getTaskColor B should return orange for 2-day tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(2)
    expect(getTaskColor(mockTask)).toContain('bg-orange-900/10')
  })

  it('getTaskColor C should return blue for 3-day tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(3)
    expect(getTaskColor(mockTask)).toContain('bg-blue-900/10')
  })

  it('getTaskColor D should return green for weekly or longer tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    expect(getTaskColor(mockTask)).toContain('bg-green-900/10')
  })

  it('getTaskColor E should return gray for other tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(0)
    expect(getTaskColor(mockTask)).toContain('bg-gray-800/30')
  })

  it('getTaskColor F should use modifications when provided', () => {
    const modifications = { 'task-1': 'day' }
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(1)
    expect(getTaskColor(mockTask, modifications)).toContain('bg-red-900/10')
  })

  it('getTaskDaysWithModifications A should return empty array for one-time tasks', () => {
    const oneTimeTask = { ...mockTask, once: 'yes' }
    expect(getTaskDaysWithModifications(oneTimeTask, {})).toStrictEqual([])
  })

  it('getTaskDaysWithModifications B should return empty array for zero recurrence', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(0)
    expect(getTaskDaysWithModifications(mockTask, {})).toStrictEqual([])
  })

  it('getTaskDaysWithModifications C should return all days for daily tasks', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(1)
    expect(getTaskDaysWithModifications(mockTask, {})).toStrictEqual(allDayIndices)
  })

  it('getTaskDaysWithModifications D should calculate weekly task days correctly', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.daysSinceCompletion).mockReturnValue(7)
    const result = getTaskDaysWithModifications(mockTask, {})
    expect(result).toMatchInlineSnapshot(`
      [
        0,
        7,
      ]
    `)
  })

  it('getTaskDaysWithModifications E should treat a never-completed task as immediately due, without calling daysSinceCompletion', () => {
    const neverCompletedTask = { ...mockTask, completedOn: '' }
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.isNeverCompleted).mockReturnValueOnce(true)
    const result = getTaskDaysWithModifications(neverCompletedTask, {})
    expect(tasksUtils.daysSinceCompletion).not.toHaveBeenCalled()
    expect(result).toMatchInlineSnapshot(`
      [
        0,
        7,
      ]
    `)
  })

  it('canMoveTaskEarlier A should be false for daily tasks', () => {
    const dailyTask: Task = { ...mockTask, once: 'day' }
    expect(canMoveTaskEarlier(dailyTask, {})).toBe(false)
  })
  it('canMoveTaskEarlier B should be false when the earliest occurrence is today', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.daysSinceCompletion).mockReturnValue(7)
    expect(canMoveTaskEarlier(mockTask, {})).toBe(false)
  })
  it('canMoveTaskEarlier C should be true when the earliest occurrence is after today', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.daysSinceCompletion).mockReturnValue(5)
    expect(canMoveTaskEarlier(mockTask, {})).toBe(true)
  })
  it('canMoveTaskEarlier D should be false when the task never appears in the window', () => {
    const oneTimeTask: Task = { ...mockTask, once: 'yes' }
    expect(canMoveTaskEarlier(oneTimeTask, {})).toBe(false)
  })
  it('createTaskDistribution A should create empty distribution for empty task list', () => {
    const result = createTaskDistribution([])
    expect(result).toMatchSnapshot()
  })

  it('createTaskDistribution B should distribute daily task to all days', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(1)
    const result = createTaskDistribution([mockTask])
    expect(Object.values(result).every(dayTasks => dayTasks.length === 1)).toBe(true)
  })

  it('createTaskDistribution C should distribute weekly task to specific days', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.daysSinceCompletion).mockReturnValue(7)
    const result = createTaskDistribution([mockTask])
    expect(result[0]).toHaveLength(1)
    expect(result[7]).toHaveLength(1)
    expect(result[1]).toHaveLength(0)
  })

  it('createTaskDistribution D should use modifications when provided', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(1)
    const modifications = { 'task-1': 'day' }
    const result = createTaskDistribution([mockTask], modifications)
    expect(Object.values(result).every(dayTasks => dayTasks.length === 1)).toBe(true)
  })

  it('computeTaskModifications A should apply frequency modifications', () => {
    const updated = computeTaskModifications({ ...emptyModifications, frequency: { 'task-1': '2-weeks' } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, once: '2-weeks' }])
  })

  it('computeTaskModifications B should skip tasks that are not found', () => {
    const updated = computeTaskModifications({ ...emptyModifications, frequency: { 'nonexistent-task': '2-weeks' } }, [mockTask])
    expect(updated).toStrictEqual([])
  })

  it('computeTaskModifications C should apply date modifications', () => {
    const updated = computeTaskModifications({ ...emptyModifications, completedOn: { 'task-1': '2023-10-01T00:00:00.000Z' } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, completedOn: '2023-10-01T00:00:00.000Z' }])
  })

  it('computeTaskModifications D should merge frequency and date modifications into a single task', () => {
    const updated = computeTaskModifications({ ...emptyModifications, completedOn: { 'task-1': '2023-10-01T00:00:00.000Z' }, frequency: { 'task-1': 'week' } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, completedOn: '2023-10-01T00:00:00.000Z', once: 'week' }])
  })

  it('computeTaskModifications E should handle multiple tasks', () => {
    const task2 = { ...mockTask, id: 'task-2' }
    const updated = computeTaskModifications({ ...emptyModifications, frequency: { 'task-1': '2-weeks', 'task-2': 'week' } }, [mockTask, task2])
    expect(updated).toStrictEqual([
      { ...mockTask, once: '2-weeks' },
      { ...task2, once: 'week' },
    ])
  })

  it('computeTaskModifications F should skip a not-found task referenced only by a date modification', () => {
    const updated = computeTaskModifications({ ...emptyModifications, completedOn: { 'nonexistent-task': '2023-10-01T00:00:00.000Z' } }, [mockTask])
    expect(updated).toStrictEqual([])
  })

  it('computeTaskModifications G should apply inline field modifications', () => {
    const updated = computeTaskModifications({ ...emptyModifications, fields: { 'task-1': { minutes: 45, name: 'Renamed', reason: 'because' } } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, minutes: 45, name: 'Renamed', reason: 'because' }])
  })

  it('computeTaskModifications H should drop a blank name and empty a blank reason', () => {
    const updated = computeTaskModifications({ ...emptyModifications, fields: { 'task-1': { name: '   ', reason: '  ' } } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, reason: undefined }])
  })

  it('computeTaskModifications I should include a task modified only through its fields', () => {
    const updated = computeTaskModifications({ ...emptyModifications, fields: { 'task-1': { minutes: 10 } } }, [mockTask])
    expect(updated).toStrictEqual([{ ...mockTask, minutes: 10 }])
  })

  it('getQuoteModifiedTaskIds A should include a task with a frequency modification', () => {
    expect(getQuoteModifiedTaskIds({ ...emptyModifications, frequency: { 'task-1': 'week' } })).toStrictEqual(new Set(['task-1']))
  })

  it('getQuoteModifiedTaskIds B should include a task with a name field modification', () => {
    expect(getQuoteModifiedTaskIds({ ...emptyModifications, fields: { 'task-1': { name: 'Renamed' } } })).toStrictEqual(new Set(['task-1']))
  })

  it('getQuoteModifiedTaskIds C should include a task with a reason field modification', () => {
    expect(getQuoteModifiedTaskIds({ ...emptyModifications, fields: { 'task-1': { reason: 'because' } } })).toStrictEqual(new Set(['task-1']))
  })

  it('getQuoteModifiedTaskIds D should exclude a task modified only through its completedOn date', () => {
    expect(getQuoteModifiedTaskIds({ ...emptyModifications, completedOn: { 'task-1': '2023-10-01T00:00:00.000Z' } })).toStrictEqual(new Set())
  })

  it('getQuoteModifiedTaskIds E should include a task modified only through its minutes field', () => {
    expect(getQuoteModifiedTaskIds({ ...emptyModifications, fields: { 'task-1': { minutes: 10 } } })).toStrictEqual(new Set(['task-1']))
  })

  it('anchoredCompletedOn A should anchor completion one recurrence before the first shown instance', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(7)
    vi.mocked(tasksUtils.daysSinceCompletion).mockReturnValue(7)
    // first instance is on today (Sunday), so a 3-day recurrence anchors completion to 3 days before today
    expect(anchoredCompletedOn(mockTask, 3)).toBe('2023-01-05')
  })

  it('anchoredCompletedOn B should return undefined for a non-positive recurrence', () => {
    expect(anchoredCompletedOn(mockTask, 0)).toBeUndefined()
  })

  it('anchoredCompletedOn C should return undefined when the task is not shown in the planner', () => {
    vi.mocked(tasksUtils.daysRecurrence).mockReturnValue(0)
    expect(anchoredCompletedOn(mockTask, 3)).toBeUndefined()
  })
})
