import { computeProgressPercent, progressAccentColor, progressText, webhookPayload } from './progress.utils'
import { taskMock } from './tasks.utils'

describe('progress.utils', () => {
  it('computeProgressPercent A should return 0 for an empty task list', () => {
    expect(computeProgressPercent([])).toBe(0)
  })

  it('computeProgressPercent B should return 0 when no task is completed', () => {
    const tasks = [taskMock({ completedOn: '' }), taskMock({ completedOn: '', id: 'task-2' })]
    expect(computeProgressPercent(tasks)).toBe(0)
  })

  it('computeProgressPercent C should return 100 when all tasks are completed', () => {
    const tasks = [taskMock({ id: 'task-1', isDone: true, once: 'yes' }), taskMock({ id: 'task-2', isDone: true, once: 'yes' })]
    expect(computeProgressPercent(tasks)).toBe(100)
  })

  it('progressAccentColor A should return the error color for 0 percent', () => {
    expect(progressAccentColor(0)).toMatchInlineSnapshot(`"var(--color-error)"`)
  })

  it('progressAccentColor B should return the bad color for 25 percent', () => {
    expect(progressAccentColor(25)).toMatchInlineSnapshot(`"var(--color-bad)"`)
  })

  it('progressAccentColor C should return the warning color for 50 percent', () => {
    expect(progressAccentColor(50)).toMatchInlineSnapshot(`"var(--color-warning)"`)
  })

  it('progressAccentColor D should return the ok color for 75 percent', () => {
    expect(progressAccentColor(75)).toMatchInlineSnapshot(`"var(--color-ok)"`)
  })

  it('progressAccentColor E should return the success color for 100 percent', () => {
    expect(progressAccentColor(100)).toMatchInlineSnapshot(`"var(--color-success)"`)
  })

  it('progressText A nothing done', () => {
    expect(progressText(0)).toMatchInlineSnapshot(`"Nothing done... yet"`)
  })

  it('progressText B default argument', () => {
    expect(progressText()).toMatchInlineSnapshot(`"Nothing done... yet"`)
  })

  it('progressText C low progress', () => {
    expect(progressText(20)).toMatchInlineSnapshot(`"Amuse-bouche : check"`)
  })

  it('progressText D around a third', () => {
    expect(progressText(33)).toMatchInlineSnapshot(`"Now we are talking"`)
  })

  it('progressText E halfway', () => {
    expect(progressText(50)).toMatchInlineSnapshot(`"Halfway to heaven"`)
  })

  it('progressText F final chapter', () => {
    expect(progressText(75)).toMatchInlineSnapshot(`"Final chapter for today"`)
  })

  it('progressText G last tasks', () => {
    expect(progressText(99)).toMatchInlineSnapshot(`"Lasts tasks remaining !"`)
  })

  it('progressText H complete', () => {
    expect(progressText(100)).toMatchInlineSnapshot(`"You made it, well done dude :)"`)
  })

  it('webhookPayload A should return correct payload with default progress', () => {
    const tasks = [taskMock({ completedOn: '', id: 'task-1', minutes: 15, name: 'Clean workspace' })]
    expect(webhookPayload(tasks)).toMatchInlineSnapshot(`"progress=0&remaining=15&nextTask=Clean workspace"`)
  })

  it('webhookPayload B should return correct payload with custom progress', () => {
    const tasks = [taskMock({ completedOn: '', id: 'task-2', minutes: 30, name: 'Review code', once: 'week' })]
    expect(webhookPayload(tasks, 75)).toMatchInlineSnapshot(`"progress=75&remaining=30&nextTask=Review code"`)
  })

  it('webhookPayload C should handle empty active tasks', () => {
    expect(webhookPayload([], 50)).toMatchInlineSnapshot(`"progress=50&remaining=0&nextTask=undefined"`)
  })

  it('webhookPayload D should filter inactive tasks correctly', () => {
    const tasks = [taskMock({ completedOn: '', id: 'active-task', minutes: 20, name: 'Active task' }), taskMock({ completedOn: '2025-08-03', id: 'inactive-task', isDone: true, minutes: 10, name: 'Inactive task' })]
    expect(webhookPayload(tasks, 25)).toMatchInlineSnapshot(`"progress=25&remaining=20&nextTask=Active task"`)
  })

  it('webhookPayload E should handle task without reason', () => {
    const tasks = [taskMock({ completedOn: '', id: 'no-reason-task', minutes: 5, name: 'Task without reason', once: 'month' })]
    expect(webhookPayload(tasks, 100)).toMatchInlineSnapshot(`"progress=100&remaining=5&nextTask=Task without reason"`)
  })
})
