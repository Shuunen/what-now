import { httpRouter } from 'convex/server'
import { type ActionCtx, httpAction } from './_generated/server'
import { callTool, textArg, tools } from './mcp'

/**
 * Model Context Protocol server, served over streamable HTTP at
 * `https://<deployment>.convex.site/mcp`.
 *
 * This exists because a hosted assistant (claude.ai and its voice mode) cannot POST to an arbitrary
 * API host — its sandbox only reaches search results and package registries. A registered MCP
 * connector is the one channel it can call out on, so the coach talks to this endpoint instead of
 * to `/api/mutation` directly.
 *
 * The server is stateless: no session id is issued, every POST is self-contained. Like the rest of
 * this template it is single-tenant and unauthenticated — whoever holds the URL holds the tasks, the
 * same trust model the app already documents for the sync URL.
 */

/** the MCP revisions this server speaks, newest first; an unknown request falls back to the newest */
const supportedProtocolVersions = ['2025-06-18', '2025-03-26', '2024-11-05']

/** advertised to the client on initialize, bumped when the tool surface changes shape */
const serverVersion = '1.0.0'

const jsonRpcVersion = '2.0'
const methodNotFound = -32_601
const invalidRequest = -32_600
const parseError = -32_700
const internalError = -32_603

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
}

/** a decoded JSON-RPC request; `id` is absent on notifications, which expect no response */
type JsonRpcRequest = { id?: number | string; method: string; params?: Record<string, unknown> }

/**
 * Wrap a JSON-RPC payload in the transport the client asked for: an SSE event when it advertised
 * `text/event-stream`, plain JSON otherwise. Both are valid streamable HTTP responses.
 * @param payload - the JSON-RPC response object
 * @param request - the incoming request, read for its `Accept` header
 * @returns the HTTP response
 */
function rpcResponse(payload: Record<string, unknown>, request: Request) {
  const body = JSON.stringify(payload)
  const wantsStream = (request.headers.get('Accept') ?? '').includes('text/event-stream')
  if (wantsStream) return new Response(`event: message\ndata: ${body}\n\n`, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }, status: 200 })
  return new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
}

/**
 * Build a JSON-RPC error payload.
 * @param id - the request id being answered, undefined when the request could not be parsed
 * @param code - the JSON-RPC error code
 * @param message - a human-readable explanation
 * @returns the error payload
 */
function rpcError(id: number | string | undefined, code: number, message: string) {
  // oxlint-disable-next-line unicorn/no-null -- JSON-RPC requires a literal null id when the request id is unknown
  return { error: { code, message }, id: id ?? null, jsonrpc: jsonRpcVersion }
}

/**
 * Pick the protocol revision to answer with: the client's own when we speak it, else our newest.
 * @param requested - the `protocolVersion` the client sent on initialize
 * @returns the revision to advertise
 */
function negotiateVersion(requested: unknown) {
  const version = textArg(requested)
  return supportedProtocolVersions.includes(version) ? version : supportedProtocolVersions[0]
}

/**
 * Answer one JSON-RPC request.
 * @param ctx - the Convex action context
 * @param rpc - the decoded request
 * @returns the JSON-RPC result payload, or undefined for a notification that expects no answer
 */
async function handleRpc(ctx: ActionCtx, rpc: JsonRpcRequest) {
  const { id, method, params = {} } = rpc
  if (method.startsWith('notifications/')) return undefined
  if (method === 'initialize')
    return {
      id,
      jsonrpc: jsonRpcVersion,
      result: {
        capabilities: { tools: { listChanged: false } },
        instructions: "Task coaching over the user's own What Now list. Call get_today once at the start of every session, before greeting the user.",
        protocolVersion: negotiateVersion(params.protocolVersion),
        serverInfo: { name: 'what-now-coach', version: serverVersion },
      },
    }
  if (method === 'ping') return { id, jsonrpc: jsonRpcVersion, result: {} }
  if (method === 'tools/list') return { id, jsonrpc: jsonRpcVersion, result: { tools } }
  if (method === 'tools/call') {
    const name = textArg(params.name)
    const args = (params.arguments ?? {}) as Record<string, unknown>
    try {
      const text = await callTool(ctx, name, args)
      return { id, jsonrpc: jsonRpcVersion, result: { content: [{ text, type: 'text' }], isError: false } }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      return { id, jsonrpc: jsonRpcVersion, result: { content: [{ text: detail, type: 'text' }], isError: true } }
    }
  }
  return rpcError(id, methodNotFound, `unknown method "${method}"`)
}

const mcpPost = httpAction(async (ctx, request) => {
  let rpc: JsonRpcRequest | undefined = undefined
  try {
    rpc = (await request.json()) as JsonRpcRequest
  } catch {
    return rpcResponse(rpcError(undefined, parseError, 'request body is not valid JSON'), request)
  }
  if (typeof rpc?.method !== 'string') return rpcResponse(rpcError(rpc?.id, invalidRequest, 'missing "method"'), request)
  try {
    const payload = await handleRpc(ctx, rpc)
    if (payload === undefined) return new Response(undefined, { headers: corsHeaders, status: 202 })
    return rpcResponse(payload, request)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return rpcResponse(rpcError(rpc.id, internalError, detail), request)
  }
})

const mcpOptions = httpAction(() => Promise.resolve(new Response(undefined, { headers: corsHeaders, status: 204 })))

/** this server never pushes messages to the client, so the SSE stream clients may open is declined */
const mcpGet = httpAction(() => Promise.resolve(new Response('this MCP server is stateless and does not open server-initiated streams', { headers: { ...corsHeaders, Allow: 'POST, OPTIONS' }, status: 405 })))

const http = httpRouter()

http.route({ handler: mcpPost, method: 'POST', path: '/mcp' })
http.route({ handler: mcpGet, method: 'GET', path: '/mcp' })
http.route({ handler: mcpOptions, method: 'OPTIONS', path: '/mcp' })

// oxlint-disable-next-line import/no-default-export -- Convex requires `http.ts` to default-export its router; this is the framework's contract, not a project style choice.
export default http
