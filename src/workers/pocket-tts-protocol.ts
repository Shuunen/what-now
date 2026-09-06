/**
 * Message protocol between src/utils/pocket-tts.utils.ts (main thread) and
 * src/workers/pocket-tts.worker.ts (the actual WASM inference). Kept in its
 * own file so both sides import the same types instead of duplicating them.
 */

export type PocketTtsLanguage = 'en' | 'fr'

export type PocketTtsRequest = { kind: 'generate'; requestId: number; text: string } | { kind: 'init'; language: PocketTtsLanguage; requestId: number; voice: string }

export type PocketTtsEvent =
  | { audio: Float32Array<ArrayBuffer>; kind: 'audio'; requestId: number; sampleRate: number }
  | { error: string; kind: 'rpc_err'; requestId: number }
  | { kind: 'rpc_ok'; payload?: { sampleRate: number }; requestId: number }

/** Like `Omit`, but distributes over union members instead of collapsing to their shared keys first. */
export type DistributiveOmit<Type, Key extends keyof Type> = Type extends unknown ? Omit<Type, Key> : never
