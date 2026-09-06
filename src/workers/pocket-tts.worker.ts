/// <reference lib="webworker" />

import type { PocketTtsEvent, PocketTtsLanguage, PocketTtsRequest } from './pocket-tts-protocol'

/**
 * Runs kyutai's pocket-tts (via babybirdprd/pocket-tts's WASM build, see
 * coach/install.sh) fully client-side, off the main thread. All model/voice
 * assets are static files under public/pocket-tts/ produced by install.sh --
 * this worker never talks to a server or to HuggingFace at runtime.
 *
 * The English config below is pocket-tts's own base model (6 transformer
 * layers). The French config targets kyutai/pocket-tts-without-voice-cloning's
 * `languages/french_24l` checkpoint, which isn't officially supported by
 * pocket-tts (English only per the upstream README) or by babybirdprd's WASM
 * bindings -- this config was reverse-engineered from the checkpoint's own
 * safetensors header (24 transformer layers, same 1024-dim/16-head shape as
 * the English model otherwise) since no config ships with it. Treat French
 * as experimental: src/utils/coach-speech.utils.ts falls back to the
 * browser's native speechSynthesis if this ever throws.
 */

declare const self: DedicatedWorkerGlobalScope

const BASE_CONFIG_YAML = `
flow_lm:
  dtype: float32
  flow:
    depth: 6
    dim: 512
  transformer:
    d_model: 1024
    hidden_scale: 4
    max_period: 10000
    num_heads: 16
    num_layers: __NUM_LAYERS__
  lookup_table:
    dim: 1024
    n_bins: 4000
    tokenizer: sentencepiece
    tokenizer_path: hf://kyutai/pocket-tts-without-voice-cloning/tokenizer.model@d4fdd22ae8c8e1cb3634e150ebeff1dab2d16df3

mimi:
  dtype: float32
  sample_rate: 24000
  channels: 1
  frame_rate: 12.5
  seanet:
    dimension: 512
    channels: 1
    n_filters: 64
    n_residual_layers: 1
    ratios: [6, 5, 4]
    kernel_size: 7
    residual_kernel_size: 3
    last_kernel_size: 3
    dilation_base: 2
    pad_mode: constant
    compress: 2
  transformer:
    d_model: 512
    num_heads: 8
    num_layers: 2
    layer_scale: 0.01
    context: 250
    dim_feedforward: 2048
    input_dimension: 512
    output_dimensions: [512]
  quantizer:
    dimension: 32
    output_dimension: 512
`

const configYamlFor = (language: PocketTtsLanguage): string => BASE_CONFIG_YAML.replace('__NUM_LAYERS__', language === 'fr' ? '24' : '6')

type WasmModelLike = {
  generate: (text: string) => Float32Array<ArrayBuffer>
  load_from_buffer: (config: Uint8Array, weights: Uint8Array, tokenizer: Uint8Array) => void
  load_voice_from_safetensors: (bytes: Uint8Array) => void
  readonly sample_rate: number
}

type WasmBindings = {
  default: (wasmPath: string) => Promise<void>
  WasmTTSModel: new () => WasmModelLike
}

const encoder = new TextEncoder()
let bindings: WasmBindings | undefined = undefined
const models = new Map<PocketTtsLanguage, WasmModelLike>()
let currentLanguage: PocketTtsLanguage | undefined = undefined

async function fetchBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`failed to fetch ${path}: ${String(response.status)}`)
  return new Uint8Array(await response.arrayBuffer())
}

const pkgUrl = '/pocket-tts/pkg/pocket_tts.js'
const wasmUrl = '/pocket-tts/pkg/pocket_tts_bg.wasm'

/**
 * Loads the wasm-bindgen glue module from public/. It can't be imported by URL directly:
 * Vite's dev server refuses to transform files living in public/ ("should not be imported
 * from source code"), so the source is fetched as text and imported from a blob URL, which
 * the browser resolves on its own without going through Vite. The wasm path then has to be
 * passed explicitly, since the glue would otherwise resolve it against its own blob: URL.
 * @returns the initialized wasm bindings
 */
async function loadBindings(): Promise<WasmBindings> {
  const response = await fetch(pkgUrl)
  const source = await response.text()
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as WasmBindings
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

async function loadModel(language: PocketTtsLanguage, voice: string): Promise<WasmModelLike> {
  bindings ??= await loadBindings()
  await bindings.default(wasmUrl)

  let model = models.get(language)
  if (!model) {
    const [weights, tokenizer] = await Promise.all([fetchBytes(`/pocket-tts/${language}/model.safetensors`), fetchBytes(`/pocket-tts/${language}/tokenizer.model`)])
    model = new bindings.WasmTTSModel()
    model.load_from_buffer(encoder.encode(configYamlFor(language)), weights, tokenizer)
    models.set(language, model)
  }

  const voiceBytes = await fetchBytes(`/pocket-tts/${language}/embeddings/${voice}.safetensors`)
  model.load_voice_from_safetensors(voiceBytes)
  return model
}

function postEvent(event: PocketTtsEvent, transfer: Transferable[] = []) {
  self.postMessage(event, transfer)
}

self.addEventListener('message', (event: MessageEvent<PocketTtsRequest>) => {
  const message = event.data
  void (async () => {
    try {
      if (message.kind === 'init') {
        const model = await loadModel(message.language, message.voice)
        currentLanguage = message.language
        postEvent({ kind: 'rpc_ok', payload: { sampleRate: model.sample_rate }, requestId: message.requestId })
        return
      }

      if (message.kind === 'generate') {
        if (!currentLanguage) throw new Error('pocket-tts worker: generate called before init')
        const model = models.get(currentLanguage)
        if (!model) throw new Error('pocket-tts worker: model not loaded for current language')
        const samples = model.generate(message.text)
        postEvent({ audio: samples, kind: 'audio', requestId: message.requestId, sampleRate: model.sample_rate }, [samples.buffer])
      }
    } catch (error) {
      postEvent({ error: error instanceof Error ? error.message : String(error), kind: 'rpc_err', requestId: message.requestId })
    }
  })()
})
