import { AppDataSchema, defaultAppData, recoverAppData, safeImportJson } from './app-data'

describe('AppDataSchema', () => {
  it('A applies defaults for an empty object', () => {
    const data = AppDataSchema.parse({})
    expect(data).toStrictEqual({ settings: { finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' }, tasks: [] })
  })

  it('B rejects duplicate task ids', () => {
    const result = AppDataSchema.safeParse({
      tasks: [
        { id: 'dup', name: 'a' },
        { id: 'dup', name: 'b' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('C accepts distinct task ids', () => {
    const result = AppDataSchema.safeParse({
      tasks: [
        { id: 'a', name: 'a' },
        { id: 'b', name: 'b' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('D parses a valid payload', () => {
    const data = AppDataSchema.parse({ tasks: [{ id: 'a', name: 'task a' }] })
    expect(data.tasks).toHaveLength(1)
  })

  it('E throws on an invalid payload', () => {
    expect(() => AppDataSchema.parse({ tasks: [{ name: 'no id' }] })).toThrow(/id/u)
  })
})

describe('defaultAppData', () => {
  it('A is an empty state', () => {
    expect(defaultAppData).toStrictEqual({ settings: { finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' }, tasks: [] })
  })
})

describe('recoverAppData', () => {
  it('A drops only the invalid tasks, keeping the valid ones', () => {
    const data = recoverAppData({
      tasks: [
        { id: 'a', minutes: -5, name: 'bad task' },
        { id: 'b', name: 'good task' },
      ],
    })
    expect(data.tasks).toHaveLength(1)
    expect(data.tasks[0]?.id).toBe('b')
  })

  it('B falls back to default settings when settings are invalid', () => {
    const data = recoverAppData({ settings: { userName: 42 }, tasks: [] })
    expect(data.settings).toStrictEqual({ finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' })
  })

  it('C handles a completely malformed document', () => {
    const data = recoverAppData('not an object')
    expect(data).toStrictEqual({ settings: { finaleDismissedOn: '', syncUrl: '', userName: 'Me', webhook: '' }, tasks: [] })
  })

  it('D drops duplicate task ids, keeping the first occurrence', () => {
    const data = recoverAppData({
      tasks: [
        { id: 'dup', name: 'first' },
        { id: 'dup', name: 'second' },
      ],
    })
    expect(data.tasks).toHaveLength(1)
    expect(data.tasks[0]?.name).toBe('first')
  })
})

describe('safeImportJson', () => {
  it('A parses valid JSON', () => {
    const result = safeImportJson(JSON.stringify({ tasks: [{ id: 'a', name: 'task a' }] }))
    expect(result).not.toHaveProperty('error')
    expect('data' in result && result.data.tasks).toHaveLength(1)
  })

  it('B rejects invalid JSON', () => {
    const result = safeImportJson('not json')
    expect('error' in result && result.error).toContain('Invalid JSON')
  })

  it('C reports schema errors', () => {
    const result = safeImportJson(JSON.stringify({ tasks: [{ name: 'no id' }] }))
    expect('error' in result && result.error).toContain('Schema error')
  })
})
