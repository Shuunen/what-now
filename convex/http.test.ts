import { convexTest } from 'convex-test'
import { invariant } from 'es-toolkit'
import { daysAgoIso10 } from 'shuutils'
import { api } from './_generated/api'
import { dateIso10 } from './recurrence'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

type TaskArgFields = Partial<{ completedOn: string; createdOn: string; deletedOn: string; id: string; isDone: boolean; minutes: number; name: string; once: string; reason: string; syncedAt: string; updatedOn: string }>

/**
 * Build full `upsertTask` args, defaulting every field so each test only states what it cares about.
 * @param fields - fields to override on top of the defaults
 * @returns a complete set of `upsertTask` mutation args
 */
function taskArgs(fields: TaskArgFields = {}) {
  return { completedOn: '', createdOn: '', deletedOn: '', id: 'task-1', isDone: false, minutes: 0, name: 'a task', once: 'day', syncedAt: '', updatedOn: '', ...fields }
}

/**
 * POST one JSON-RPC request at the MCP endpoint.
 * @param t - the convex-test harness
 * @param method - the JSON-RPC method
 * @param params - the JSON-RPC params, defaults to empty
 * @param accept - the Accept header to send, defaults to plain JSON
 * @returns the raw HTTP response
 */
function rpc(t: ReturnType<typeof convexTest>, method: string, params: Record<string, unknown> = {}, accept = 'application/json') {
  return t.fetch('/mcp', { body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }), headers: { Accept: accept, 'Content-Type': 'application/json' }, method: 'POST' })
}

/**
 * Call one MCP tool and parse the JSON payload it answered with.
 * @param t - the convex-test harness
 * @param name - the tool name
 * @param args - the tool arguments, defaults to empty
 * @returns the parsed tool result, plus whether the tool reported an error
 */
async function callTool(t: ReturnType<typeof convexTest>, name: string, args: Record<string, unknown> = {}) {
  const response = await rpc(t, 'tools/call', { arguments: args, name })
  const body = (await response.json()) as { result: { content: { text: string }[]; isError: boolean } }
  const text = body.result.content[0]?.text ?? ''
  return { isError: body.result.isError, text, value: body.result.isError ? undefined : (JSON.parse(text) as Record<string, unknown>) }
}

describe('protocol', () => {
  it('A negotiates a known protocol version and identifies the server', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'initialize', { protocolVersion: '2025-03-26' })
    const body = (await response.json()) as { result: { protocolVersion: string; serverInfo: { name: string } } }
    expect(body.result.protocolVersion).toBe('2025-03-26')
    expect(body.result.serverInfo.name).toBe('what-now-coach')
  })
  it('B falls back to its newest revision for an unknown one', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'initialize', { protocolVersion: '1999-01-01' })
    const body = (await response.json()) as { result: { protocolVersion: string } }
    expect(body.result.protocolVersion).toBe('2025-06-18')
  })
  it('C lists every coaching tool', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'tools/list')
    const body = (await response.json()) as { result: { tools: { name: string }[] } }
    const names = body.result.tools.map(tool => tool.name)
    expect(names).toStrictEqual(['get_today', 'find_task', 'add_task', 'complete_task', 'uncomplete_task', 'defer_task', 'set_reason', 'update_task', 'delete_task'])
  })
  it('D answers a notification with 202 and no body', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), headers: { 'Content-Type': 'application/json' }, method: 'POST' })
    expect(response.status).toBe(202)
  })
  it('E answers ping', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'ping')
    const body = (await response.json()) as { result: Record<string, unknown> }
    expect(body.result).toStrictEqual({})
  })
  it('F rejects an unknown method', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'tools/teleport')
    const body = (await response.json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32_601)
  })
  it('G rejects a body that is not JSON', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { body: 'not json', headers: { 'Content-Type': 'application/json' }, method: 'POST' })
    const body = (await response.json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32_700)
  })
  it('H rejects a request with no method', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { body: JSON.stringify({ id: 1, jsonrpc: '2.0' }), headers: { 'Content-Type': 'application/json' }, method: 'POST' })
    const body = (await response.json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32_600)
  })
  it('I frames the answer as an event stream when the client asks for one', async () => {
    const t = convexTest(schema, modules)
    const response = await rpc(t, 'ping', {}, 'application/json, text/event-stream')
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    await expect(response.text()).resolves.toContain('event: message\ndata: {')
  })
  it('J declines a server-initiated stream', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { method: 'GET' })
    expect(response.status).toBe(405)
  })
  it('K answers a CORS preflight', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { method: 'OPTIONS' })
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('get_today', () => {
  it('A returns only the due tasks, most overdue first', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(0), id: 'done-today', name: 'already done', once: 'day' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(8), id: 'mild', name: 'mildly late', once: 'week' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(20), id: 'severe', name: 'very late', once: 'week' }))
    const { value } = await callTool(t, 'get_today')
    invariant(value, 'get_today should answer with a payload')
    expect(value.dueCount).toBe(2)
    expect((value.dueTasks as { id: string }[]).map(task => task.id)).toStrictEqual(['severe', 'mild'])
    expect(value.today).toBe(dateIso10())
  })
  it('B reports the progress percent and remaining minutes', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(0), id: 'done', once: 'day' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(2), id: 'todo', minutes: 15, once: 'day' }))
    const { value } = await callTool(t, 'get_today')
    expect(value?.progressPercent).toBe(50)
    expect(value?.totalMinutes).toBe(15)
  })
  it('C counts the tasks still missing a reason', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'bare' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'motivated', reason: 'it matters' }))
    const { value } = await callTool(t, 'get_today')
    expect(value?.tasksMissingAReason).toBe(1)
  })
  it('D hides deleted and finished tasks', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ deletedOn: '2025-01-01T00:00:00.000Z', id: 'gone' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'finished', isDone: true }))
    const { value } = await callTool(t, 'get_today')
    expect(value?.dueCount).toBe(0)
  })
})

describe('find_task', () => {
  it('A matches on name, ignoring accents and case', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'tidy', name: 'ranger un truc qui traîne' }))
    const { value } = await callTool(t, 'find_task', { query: 'TRAINE' })
    expect(value?.matchCount).toBe(1)
  })
  it('B matches on the reason too', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'kitchen', name: 'cuisine', reason: 'je dors mal quand c est le bazar' }))
    const { value } = await callTool(t, 'find_task', { query: 'bazar' })
    expect(value?.matchCount).toBe(1)
  })
  it('C skips deleted tasks', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ deletedOn: '2025-01-01T00:00:00.000Z', id: 'gone', name: 'cuisine' }))
    const { value } = await callTool(t, 'find_task', { query: 'cuisine' })
    expect(value?.matchCount).toBe(0)
  })
  it('D refuses an empty query', async () => {
    const t = convexTest(schema, modules)
    const result = await callTool(t, 'find_task', { query: '  ' })
    expect(result.isError).toBe(true)
  })
})

describe('add_task', () => {
  it('A echoes back the task it created', async () => {
    const t = convexTest(schema, modules)
    const { value } = await callTool(t, 'add_task', { name: 'sortir le verre', once: '2-weeks', reason: 'sinon ca deborde' })
    invariant(value, 'add_task should answer with a payload')
    const added = value.added as { id: string; name: string; reason: string; rhythm: string }
    expect(added.name).toBe('sortir le verre')
    expect(added.rhythm).toBe('2-weeks')
    expect(added.reason).toBe('sinon ca deborde')
    expect(added.id.length).toBeGreaterThan(0)
  })
  it('B stores it with a stamped sync clock', async () => {
    const t = convexTest(schema, modules)
    await callTool(t, 'add_task', { name: 'sortir le verre', once: '2-weeks' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored).toHaveLength(1)
    expect(stored[0]?.syncedAt).not.toBe('')
  })
  it('C defaults to a daily rhythm', async () => {
    const t = convexTest(schema, modules)
    const { value } = await callTool(t, 'add_task', { name: 'vaisselle' })
    invariant(value, 'add_task should answer with a payload')
    expect((value.added as { rhythm: string }).rhythm).toBe('day')
  })
  it('D refuses an empty name', async () => {
    const t = convexTest(schema, modules)
    const result = await callTool(t, 'add_task', { name: '   ' })
    expect(result.isError).toBe(true)
  })
  it('E caps an over-long name at the app own limit', async () => {
    const t = convexTest(schema, modules)
    const { value } = await callTool(t, 'add_task', { name: 'x'.repeat(300) })
    invariant(value, 'add_task should answer with a payload')
    expect((value.added as { name: string }).name).toHaveLength(150)
  })
})

describe('rhythm validation', () => {
  it('A add_task refuses a rhythm the app cannot parse', async () => {
    const t = convexTest(schema, modules)
    const result = await callTool(t, 'add_task', { name: 'vaisselle', once: 'weekly' })
    expect(result.isError).toBe(true)
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored).toHaveLength(0)
  })
  it('B update_task refuses a rhythm the app cannot parse and keeps the old one', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', once: 'week' }))
    const result = await callTool(t, 'update_task', { id: 'task-1', once: 'every 2 days' })
    expect(result.isError).toBe(true)
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.once).toBe('week')
  })
  it('C accepts the documented forms', async () => {
    const t = convexTest(schema, modules)
    const results = await Promise.all(['day', 'yes', '2-weeks', '3-months', 'year'].map(once => callTool(t, 'add_task', { name: `tache ${once}`, once })))
    expect(results.every(result => !result.isError)).toBe(true)
  })
})

describe('complete_task', () => {
  it('A stamps today and bumps the sync clock', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(3), id: 'task-1' }))
    await callTool(t, 'complete_task', { id: 'task-1' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.completedOn).toBe(dateIso10())
    expect(stored[0]?.syncedAt).not.toBe('')
  })
  it('B finishes a one-time task for good', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', once: 'yes' }))
    await callTool(t, 'complete_task', { id: 'task-1' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.isDone).toBe(true)
  })
  it('C leaves a recurring task un-finished', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', once: 'week' }))
    await callTool(t, 'complete_task', { id: 'task-1' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.isDone).toBe(false)
  })
  it('D reports a helpful error for an unknown id', async () => {
    const t = convexTest(schema, modules)
    const result = await callTool(t, 'complete_task', { id: 'nope' })
    expect(result.isError).toBe(true)
    expect(result.text).toContain('no task found')
  })
})

describe('uncomplete_task', () => {
  it('A makes the task due again right now', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: dateIso10(), id: 'task-1', once: 'week' }))
    await callTool(t, 'uncomplete_task', { id: 'task-1' })
    const { value } = await callTool(t, 'get_today')
    expect(value?.dueCount).toBe(1)
  })
})

describe('defer_task', () => {
  it('A refuses a daily task instead of faking a completion', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', once: 'day' }))
    const { value } = await callTool(t, 'defer_task', { id: 'task-1' })
    expect(value?.refused).toBe(true)
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.completedOn).toBe('')
  })
  it('B refuses a one-time task', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', once: 'yes' }))
    const { value } = await callTool(t, 'defer_task', { id: 'task-1' })
    expect(value?.refused).toBe(true)
    expect(value?.why).toContain('one-time')
  })
  it('C pushes a weekly task out of today and warns about the cost', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ completedOn: daysAgoIso10(9), id: 'task-1', once: 'week' }))
    const { value } = await callTool(t, 'defer_task', { id: 'task-1' })
    expect(value?.warning).toContain('rhythm has shifted')
    const today = await callTool(t, 'get_today')
    expect(today.value?.dueCount).toBe(0)
  })
})

describe('set_reason', () => {
  it('A saves the reason and stamps the edit clock', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1' }))
    await callTool(t, 'set_reason', { id: 'task-1', reason: 'je dors mal quand la cuisine est en bazar' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.reason).toBe('je dors mal quand la cuisine est en bazar')
    expect(stored[0]?.updatedOn).not.toBe('')
  })
  it('B refuses an empty reason', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1' }))
    const result = await callTool(t, 'set_reason', { id: 'task-1', reason: '  ' })
    expect(result.isError).toBe(true)
  })
})

describe('update_task', () => {
  it('A changes only the fields provided', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', minutes: 20, name: 'cuisine', once: 'day', reason: 'garder' }))
    await callTool(t, 'update_task', { id: 'task-1', once: '2-weeks' })
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.once).toBe('2-weeks')
    expect(stored[0]?.name).toBe('cuisine')
    expect(stored[0]?.minutes).toBe(20)
    expect(stored[0]?.reason).toBe('garder')
  })
  it('B refuses an empty name and leaves the task untouched', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', name: 'cuisine' }))
    const result = await callTool(t, 'update_task', { id: 'task-1', name: '   ' })
    expect(result.isError).toBe(true)
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored[0]?.name).toBe('cuisine')
  })
})

describe('delete_task', () => {
  it('A soft-deletes, keeping the row recoverable', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1' }))
    const { value } = await callTool(t, 'delete_task', { id: 'task-1' })
    expect(value?.recoverable).toBe(true)
    const stored = await t.query(api.tasks.getAllTasks, {})
    expect(stored).toHaveLength(1)
    expect(stored[0]?.deletedOn).not.toBe('')
  })
})
