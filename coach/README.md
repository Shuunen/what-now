# What Now — Voice Coach (spike)

Personal, local-only voice coach companion for What Now. Not part of the
core app's build/deploy pipeline. See the design doc for full context:
`~/.gstack/projects/Shuunen-what-now/rominou-master-design-20260806-195556.md`

Current status: **T1, crude validation spike — SUCCESS, live-verified.**
One hardcoded task, one Ollama call (`llama3.2`), no Convex integration
yet. Answers T1's one question — does the core loop feel pleasant? —
with: works, but not smooth, and the coach can't be interrupted
mid-sentence (see "Known limitations" below).

## Setup

Requirements: a real microphone and speakers, and system audio dev headers
for `pyaudio` (`sudo apt install portaudio19-dev` on Debian/Ubuntu — one-time,
needs your own terminal since it needs a sudo password prompt).

Then, with Ollama running (`ollama serve`):

```bash
./run.sh
```

First run creates the venv, installs dependencies, and pulls `llama3.2` if
you don't have it. Every run after that just starts the coach directly.
Full output also goes to `run.log` for debugging.

Kokoro (TTS) and Whisper (STT, via `faster-whisper`) download their model
weights on first run — expect a pause the first time you run the spike.

## Known limitations (accepted for this spike, not yet fixed)

- **No barge-in — you cannot interrupt the coach.** A software mute gate
  (`MuteWhileBotSpeaking` in `spike.py`) hard-drops mic input while the bot
  is speaking, plus a 0.5s cooldown after. This was the fallback after two
  real attempts at proper echo cancellation failed on this hardware:
  speaker output caused a self-interrupt loop (VAD heard the coach through
  the mic), and headphone output *also* leaked enough into the room for
  the webcam mic to pick it up. A PipeWire WebRTC echo-cancel module
  (`libpipewire-module-echo-cancel`) loaded without error but produced a
  silent virtual mic in testing — not reliable enough to chase further
  within spike scope. See the design doc's "Measured Results" for the full
  debugging trail.
- **Interaction isn't smooth** — noticeable pauses/pacing issues in the
  turn-taking. Not yet root-caused; likely candidates are STT/LLM/TTS
  round-trip latency stacking, or the mute-gate cooldown window. Worth
  profiling before building further on top.

## Why `llama3.2` and why `num_ctx: 2048`

Measured on this machine (RTX 4070 SUPER, 12GB VRAM): a larger model
(29.9B params) didn't fit in VRAM and ran at 13.5s/call — a non-starter for
a 4-call-per-turn, ~2s-budget design. `llama3.2` (3.2B) fits fully in VRAM
and hits ~130ms/call warm, but *only* after capping `num_ctx` — the
default 64k context window alone eats enough VRAM to force partial CPU
offload even on this small model. See the design doc's "Measured Results"
section for the full numbers.

## Next steps

See the design doc's "Next Steps" section for what comes after this spike:
timing the real 4-call Ollama pipeline, wiring the reactive Convex task
subscription, the shared write-validation wrapper, and — before building
much more on top — root-causing the pacing/smoothness issue and deciding
whether real barge-in (proper AEC, or a headset with the mic positioned
away from the ear speakers) is worth chasing further.
