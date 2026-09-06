#!/usr/bin/env bash
set -euo pipefail

# Sets up kyutai's pocket-tts (https://github.com/kyutai-labs/pocket-tts) as a
# fully in-browser WASM voice for the coach, replacing the browser's native
# speechSynthesis (see src/utils/coach-speech.utils.ts and
# src/utils/pocket-tts.utils.ts). No server process: this builds a WASM
# package and downloads static model assets into public/pocket-tts/, which
# Vite just serves like any other static file when running `pnpm dev`.
#
# English uses pocket-tts's own base model. French is experimental: pocket-tts
# is officially English-only (see the upstream README), and the French
# checkpoint used below (languages/french_24l on
# kyutai/pocket-tts-without-voice-cloning) isn't documented or officially
# supported by the WASM bindings this script builds -- its config was
# reverse-engineered from the checkpoint's own safetensors header. If it
# fails to load or sounds wrong, src/utils/coach-speech.utils.ts falls back to
# the browser's native speechSynthesis automatically.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENDOR_DIR="${SCRIPT_DIR}/vendor/pocket-tts"
PUBLIC_DIR="${REPO_ROOT}/public/pocket-tts"
POCKET_TTS_REPO="https://github.com/babybirdprd/pocket-tts.git"
HF_REPO="https://huggingface.co/kyutai/pocket-tts-without-voice-cloning/resolve/main"
VOICE="jean"

require_command() {
  local name="$1"
  local hint="${2:-}"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Error: required command not found in PATH: $name" >&2
    if [[ -n "$hint" ]]; then echo "Install hint: $hint" >&2; fi
    exit 1
  fi
}

echo "== Checking prerequisites =="
require_command git
require_command curl
require_command cargo "install Rust via https://rustup.rs"
rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

echo "== Fetching babybirdprd/pocket-tts (WASM build of kyutai's pocket-tts) =="
if [[ -d "$VENDOR_DIR/.git" ]]; then
  git -C "$VENDOR_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$VENDOR_DIR")"
  git clone --depth 1 "$POCKET_TTS_REPO" "$VENDOR_DIR"
fi

echo "== Installing wasm-bindgen-cli matching this checkout's Cargo.lock =="
WASM_BINDGEN_VERSION="$(grep -A1 'name = "wasm-bindgen"' "$VENDOR_DIR/Cargo.lock" | grep version | head -1 | sed -E 's/.*"(.*)".*/\1/')"
if ! command -v wasm-bindgen >/dev/null 2>&1 || [[ "$(wasm-bindgen --version 2>/dev/null | awk '{print $2}')" != "$WASM_BINDGEN_VERSION" ]]; then
  cargo install wasm-bindgen-cli --version "$WASM_BINDGEN_VERSION" --locked
fi

echo "== Building the pocket-tts WASM package =="
bash "$VENDOR_DIR/scripts/build-wasm.sh"

echo "== Copying WASM artifacts into public/pocket-tts/pkg/ =="
mkdir -p "$PUBLIC_DIR/pkg"
cp "$VENDOR_DIR/crates/pocket-tts/pkg/pocket_tts.js" "$PUBLIC_DIR/pkg/"
cp "$VENDOR_DIR/crates/pocket-tts/pkg/pocket_tts_bg.wasm" "$PUBLIC_DIR/pkg/"

fetch_if_missing() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    echo "  already have $(basename "$dest"), skipping"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  echo "  downloading $(basename "$dest") <- $url"
  curl -fL --progress-bar "$url" -o "$dest"
}

echo "== Downloading English model assets (~225MB) =="
fetch_if_missing "$HF_REPO/tts_b6369a24.safetensors" "$PUBLIC_DIR/en/model.safetensors"
fetch_if_missing "$HF_REPO/tokenizer.model" "$PUBLIC_DIR/en/tokenizer.model"
fetch_if_missing "$HF_REPO/embeddings/$VOICE.safetensors" "$PUBLIC_DIR/en/embeddings/$VOICE.safetensors"

echo "== Downloading French model assets (experimental, ~675MB) =="
fetch_if_missing "$HF_REPO/languages/french_24l/model.safetensors" "$PUBLIC_DIR/fr/model.safetensors"
fetch_if_missing "$HF_REPO/languages/french_24l/tokenizer.model" "$PUBLIC_DIR/fr/tokenizer.model"
fetch_if_missing "$HF_REPO/languages/french_24l/embeddings/$VOICE.safetensors" "$PUBLIC_DIR/fr/embeddings/$VOICE.safetensors"

echo
echo "Done. public/pocket-tts/ is ready -- \`pnpm dev\` will serve it as-is, no separate server needed."
echo "Re-run this script any time to pick up a newer babybirdprd/pocket-tts build; already-downloaded model files are skipped."
