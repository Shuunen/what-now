import { emptyForm, formToFields, submitNewTask, taskToForm } from './task-form.utils'
import { type NewTaskFields, taskMock } from './tasks.utils'

describe('taskToForm', () => {
  it('A maps a recurring task with minutes and reason', () => {
    const form = taskToForm(taskMock({ minutes: 30, once: '2-weeks', reason: 'stay tidy' }))
    expect(form).toStrictEqual({ minutes: '30', name: 'a super task', quantity: '2', reason: 'stay tidy', unit: 'week' })
  })
  it('B leaves minutes empty when the task has none', () => {
    expect(taskToForm(taskMock({ minutes: 0 })).minutes).toBe('')
  })
  it('C leaves reason empty when the task has none', () => {
    expect(taskToForm(taskMock({ reason: undefined })).reason).toBe('')
  })
})

describe('formToFields', () => {
  it('A returns undefined when the name is blank', () => {
    expect(formToFields({ ...emptyForm, name: '  ' })).toBeUndefined()
  })
  it('B builds fields from a filled form', () => {
    expect(formToFields({ minutes: '20', name: 'water plants', quantity: '3', reason: 'keep them alive', unit: 'day' })).toStrictEqual({ minutes: 20, name: 'water plants', once: '3-days', reason: 'keep them alive' })
  })
  it('C defaults minutes to zero and drops an empty reason', () => {
    expect(formToFields({ ...emptyForm, name: 'water plants' })).toStrictEqual({ minutes: 0, name: 'water plants', once: 'day', reason: undefined })
  })
})

describe('submitNewTask', () => {
  it('A adds the task and calls onDone', () => {
    const addTask = vi.fn<(fields: NewTaskFields) => void>()
    const onDone = vi.fn<() => void>()
    submitNewTask(addTask, { name: 'water plants' }, onDone)
    expect(addTask).toHaveBeenCalledWith({ name: 'water plants' })
    expect(onDone).toHaveBeenCalledOnce()
  })
})
