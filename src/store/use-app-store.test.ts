import { invariant } from 'es-toolkit'
import { daysAgoIso10 } from 'shuutils'
import { defaultAppData } from '../schemas/app-data'
import { taskMock } from '../utils/tasks.utils'
import { useAppStore } from './use-app-store'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isLoading: true })
  })

  it('A loadData replaces data and clears loading', () => {
    const data = { settings: { finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' }, tasks: [taskMock({ id: 'a' })] }
    useAppStore.getState().loadData(data)
    expect(useAppStore.getState().data).toStrictEqual(data)
    expect(useAppStore.getState().isLoading).toBe(false)
  })

  it('B toggleTask completes an active task in place', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ completedOn: daysAgoIso10(1), id: 'a', once: 'day' })] })
    useAppStore.getState().toggleTask('a')
    expect(useAppStore.getState().data.tasks[0]?.completedOn).toBe(daysAgoIso10(0))
  })

  it('C toggleTask leaves other tasks untouched', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a' }), taskMock({ id: 'b' })] })
    useAppStore.getState().toggleTask('a')
    expect(useAppStore.getState().data.tasks[1]?.id).toBe('b')
  })

  it('D updateTasks patches matching tasks by id', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a', once: 'day' }), taskMock({ id: 'b', once: 'day' })] })
    useAppStore.getState().updateTasks([taskMock({ id: 'b', once: 'week' })])
    expect(useAppStore.getState().data.tasks[0]?.once).toBe('day')
    expect(useAppStore.getState().data.tasks[1]?.once).toBe('week')
  })

  it('E setWebhook updates the setting', () => {
    useAppStore.getState().setWebhook('https://example.com')
    expect(useAppStore.getState().data.settings.webhook).toBe('https://example.com')
  })

  it('F setFinaleDismissedOn updates the setting', () => {
    useAppStore.getState().setFinaleDismissedOn('2025-01-01')
    expect(useAppStore.getState().data.settings.finaleDismissedOn).toBe('2025-01-01')
  })
  it('F2 setUserName updates the setting', () => {
    useAppStore.getState().setUserName('Alice')
    expect(useAppStore.getState().data.settings.userName).toBe('Alice')
  })
  it('F3 setSyncUrl updates the setting', () => {
    useAppStore.getState().setSyncUrl('https://example.convex.cloud')
    expect(useAppStore.getState().data.settings.syncUrl).toBe('https://example.convex.cloud')
  })
  it('F4 setSyncStatus updates the live sync status', () => {
    useAppStore.getState().setSyncStatus('syncing')
    expect(useAppStore.getState().syncStatus).toBe('syncing')
  })
  it('G2 mergeTasks patches an existing task by id and leaves others untouched', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a', once: 'day' }), taskMock({ id: 'b', once: 'day' })] })
    useAppStore.getState().mergeTasks([taskMock({ id: 'b', once: 'week' })])
    expect(useAppStore.getState().data.tasks[0]?.once).toBe('day')
    expect(useAppStore.getState().data.tasks[1]?.once).toBe('week')
  })

  it('G3 mergeTasks appends a task with no existing local match', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a' })] })
    useAppStore.getState().mergeTasks([taskMock({ id: 'brand-new' })])
    expect(useAppStore.getState().data.tasks).toHaveLength(2)
    expect(useAppStore.getState().data.tasks[1]?.id).toBe('brand-new')
  })

  it('H removeTask soft-deletes the matching task in place', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a' })] })
    useAppStore.getState().removeTask('a')
    expect(useAppStore.getState().data.tasks[0]?.deletedOn).not.toBe('')
  })

  it('I removeTask leaves other tasks untouched', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a' }), taskMock({ id: 'b' })] })
    useAppStore.getState().removeTask('a')
    expect(useAppStore.getState().data.tasks[1]?.deletedOn).toBe('')
  })

  it('G addTask prepends a new active task', () => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ id: 'a' })] })
    useAppStore.getState().addTask({ name: 'brand new task', once: 'week' })
    const { tasks } = useAppStore.getState().data
    const [first] = tasks
    invariant(first, 'expected the new task to be first')
    expect(tasks).toHaveLength(2)
    expect(first).toMatchObject({ completedOn: '', name: 'brand new task', once: 'week' })
    expect(tasks[1]?.id).toBe('a')
  })
})
