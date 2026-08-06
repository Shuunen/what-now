import { classifyIntent, pickNextTask } from './coach-language.utils'
import { taskMock } from './tasks.utils'

describe('coach-language.utils', () => {
  it('A classifyIntent en detects done', () => {
    expect(classifyIntent('yeah I already did it', 'en')).toBe('done')
  })
  it('B classifyIntent en detects delay', () => {
    expect(classifyIntent('delay it please', 'en')).toBe('delay')
  })
  it('C classifyIntent en detects snooze', () => {
    expect(classifyIntent("I'm busy right now", 'en')).toBe('snooze')
  })
  it('D classifyIntent en detects another', () => {
    expect(classifyIntent('give me another task', 'en')).toBe('another')
  })
  it('E classifyIntent en returns unclear on unrelated speech', () => {
    expect(classifyIntent('what a nice day', 'en')).toBe('unclear')
  })
  it('F classifyIntent fr detects done', () => {
    expect(classifyIntent("c'est déjà fait", 'fr')).toBe('done')
  })
  it('G classifyIntent fr detects delay', () => {
    expect(classifyIntent('plus tard', 'fr')).toBe('delay')
  })
  it('H classifyIntent fr detects snooze', () => {
    expect(classifyIntent('je suis occupé', 'fr')).toBe('snooze')
  })
  it('I classifyIntent fr detects another', () => {
    expect(classifyIntent('une autre tâche', 'fr')).toBe('another')
  })
  it('J pickNextTask returns the first active task not skipped', () => {
    const taskA = taskMock({ completedOn: '', id: 'a', once: 'day' })
    const taskB = taskMock({ completedOn: '', id: 'b', once: 'day' })
    const next = pickNextTask([taskA, taskB], new Set())
    expect(next?.id).toBe('a')
  })
  it('K pickNextTask skips ids already in the skip set', () => {
    const taskA = taskMock({ completedOn: '', id: 'a', once: 'day' })
    const taskB = taskMock({ completedOn: '', id: 'b', once: 'day' })
    const next = pickNextTask([taskA, taskB], new Set(['a']))
    expect(next?.id).toBe('b')
  })
  it('L pickNextTask returns undefined when the queue is empty', () => {
    const doneTask = taskMock({ id: 'a', isDone: true, once: 'yes' })
    expect(pickNextTask([doneTask], new Set())).toBeUndefined()
  })
})
