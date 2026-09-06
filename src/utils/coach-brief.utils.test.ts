import { daysAgoIso10 } from 'shuutils'
import { buildTaskBriefs, closingDirective, describeTaskBriefs, findBriefTask, openingDirective, replyDirective, silenceDirective } from './coach-brief.utils'
import { taskMock } from './tasks.utils'

const noSkips = new Set<string>()

describe('coach-brief.utils buildTaskBriefs', () => {
  it('A numbers the active tasks from one', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'one' }), taskMock({ completedOn: '', id: 'b', name: 'two' })], noSkips)
    expect(briefs.map(brief => brief.number)).toStrictEqual([1, 2])
  })

  it('B leaves out tasks that are not active', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: daysAgoIso10(0), id: 'a', name: 'done today', once: 'day' }), taskMock({ completedOn: '', id: 'b', name: 'still to do' })], noSkips)
    expect(briefs.map(brief => brief.task.name)).toStrictEqual(['still to do'])
  })

  it('C leaves out tasks set aside earlier in the conversation', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'skipped' }), taskMock({ completedOn: '', id: 'b', name: 'kept' })], new Set(['a']))
    expect(briefs.map(brief => brief.task.name)).toStrictEqual(['kept'])
  })

  it('D puts the most overdue task first', () => {
    const fresh = taskMock({ completedOn: daysAgoIso10(2), id: 'a', name: 'barely late', once: 'day' })
    const late = taskMock({ completedOn: daysAgoIso10(9), id: 'b', name: 'very late', once: 'day' })
    const briefs = buildTaskBriefs([fresh, late], noSkips)
    expect(briefs.map(brief => brief.task.name)).toStrictEqual(['very late', 'barely late'])
  })
})

describe('coach-brief.utils describeTaskBriefs', () => {
  it('A describes a task with its reason, duration and lateness', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: daysAgoIso10(5), id: 'a', minutes: 15, name: 'vacuum', once: 'day', reason: 'my allergies' })], noSkips)
    const text = describeTaskBriefs(briefs)
    expect(text).toContain('1. "vacuum"')
    expect(text).toContain('it matters because: my allergies')
    expect(text).toContain('about 15 minutes')
    expect(text).toContain('4 days overdue')
  })

  it('B flags a missing reason so the coach can ask about it naturally', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'vacuum', reason: undefined })], noSkips)
    expect(describeTaskBriefs(briefs)).toContain('no reason recorded yet')
  })

  it('C says a never-completed task has never been done', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'vacuum' })], noSkips)
    expect(describeTaskBriefs(briefs)).toContain('never done yet')
  })

  it('D omits the duration when the task has no estimate', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', minutes: 0, name: 'vacuum' })], noSkips)
    expect(describeTaskBriefs(briefs)).not.toContain('minutes')
  })

  it('E says a task due today is due today, not overdue', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: daysAgoIso10(1), id: 'a', name: 'vacuum', once: 'day' })], noSkips)
    expect(describeTaskBriefs(briefs)).toContain('due today')
  })

  it('F calls a one-off task a one-off, since it has no recurrence to be late on', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'call the plumber', once: 'yes' })], noSkips)
    expect(describeTaskBriefs(briefs)).toContain('a one-off, not recurring')
  })

  it('G marks an empty list as everything done', () => {
    expect(describeTaskBriefs([])).toContain('none, everything is done')
  })
})

describe('coach-brief.utils findBriefTask', () => {
  it('A finds the task behind a number', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'one' }), taskMock({ completedOn: '', id: 'b', name: 'two' })], noSkips)
    expect(findBriefTask(briefs, 2)?.id).toBe('b')
  })

  it('B returns nothing for a number the model made up', () => {
    const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'one' })], noSkips)
    expect(findBriefTask(briefs, 7)).toBeUndefined()
  })
})

describe('coach-brief.utils directives', () => {
  const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', minutes: 10, name: 'dishes' }), taskMock({ completedOn: '', id: 'b', minutes: 20, name: 'vacuum' })], noSkips)

  it('A opening asks for a greeting and a suggested starting point', () => {
    const text = openingDirective(briefs)
    expect(text).toContain('Greet him')
    expect(text).toContain('suggest one task to start with')
    expect(text).toContain('2 tasks left, roughly 30 minutes')
  })

  it('A2 opening skips the time estimate when no task has one', () => {
    const noEstimates = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', minutes: 0, name: 'dishes' })], noSkips)
    const text = openingDirective(noEstimates)
    expect(text).toContain('1 tasks left)')
    expect(text).not.toContain('minutes')
  })

  it('B reply carries his words and what the app changed', () => {
    const text = replyDirective(briefs, 'I did the dishes', 'marked "dishes" as done.')
    expect(text).toContain('He just said out loud: "I did the dishes"')
    expect(text).toContain('marked "dishes" as done.')
  })

  it('C reply says nothing about changes when there were none', () => {
    expect(replyDirective(briefs, 'what else is there', '')).not.toContain('has just done this')
  })

  it('D silence asks for a warm check-in', () => {
    expect(silenceDirective(briefs)).toContain('Check in on him warmly')
  })

  it('E closing congratulates when the list is empty', () => {
    expect(closingDirective([])).toContain('Everything on his list is done')
  })

  it('F closing does not push him when he stops with tasks left', () => {
    const text = closingDirective(briefs)
    expect(text).toContain('wants to stop here')
    expect(text).toContain('do not try to convince him')
  })
})
