"""Crude validation spike for the What Now voice coach (design doc Next Steps T1).

Throwaway code. Its only job is to answer one question: does talking to
Ollama through Pipecat, with local STT (faster-whisper) and local TTS
(Kokoro), feel pleasant to use at all -- before investing in the hardened
4-call Ollama pipeline, VAD-verified barge-in, or Convex task data.

No barge-in: a software mute gate (MuteWhileBotSpeaking) drops mic input
while the bot is speaking, since real echo cancellation proved unreliable
on real hardware during testing (see the design doc's Measured Results).
The coach always finishes speaking; you cannot interrupt it.

Auto-stops itself after STOP_AFTER_TURNS full exchanges (see main()) and
prints a full timestamped timeline plus a "longest steps" breakdown --
no need to Ctrl+C.

Run (on your actual machine, not a sandboxed dev container -- this needs a
real microphone/speaker and `portaudio19-dev` installed for `pyaudio`):

    ollama serve &
    ollama pull llama3.2
    cd coach
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python3 server/spike.py
"""

import asyncio
import atexit
import time

# Captured as close to the actual process launch as this code can reach --
# before any pipecat imports run, so "t=0" in the timeline genuinely means
# "bare script start," per the request to time every step from there.
_SCRIPT_START = time.time()

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.processors.audio.vad_processor import VADProcessor
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    Frame,
    InputAudioRawFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.kokoro.tts import KokoroTTSService
from pipecat.services.ollama.llm import OllamaLLMSettings, OLLamaLLMService
from pipecat.services.whisper.stt import Model, WhisperSTTService
from pipecat.transcriptions.language import Language
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

from timing import TimingLog, TimingObserver


class RawAudioFrameCounter(FrameProcessor):
    """Diagnostic-only: prints a running count of InputAudioRawFrame every ~1s,
    so we can tell whether raw mic audio is reaching the pipeline at all --
    independent of whether Silero VAD ever fires on it."""

    def __init__(self) -> None:
        super().__init__()
        self._count = 0
        self._last_print = 0.0

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if isinstance(frame, InputAudioRawFrame):
            self._count += 1
            now = asyncio.get_event_loop().time()
            if now - self._last_print > 1.0:
                print(f"[coach] raw audio frames received so far: {self._count}")
                self._last_print = now
        await self.push_frame(frame, direction)


class MuteWhileBotSpeaking(FrameProcessor):
    """Drops raw mic audio while the bot is speaking (plus a short cooldown
    after it stops), so VAD/STT never sees the coach's own voice at all --
    a hard mute, not reliant on acoustic isolation or echo cancellation.

    Needed because: (1) real hardware testing showed headphone output alone
    doesn't fully stop the webcam mic from picking up bleed in a quiet room
    (confirmed via Whisper transcribing fragments of the coach's own recent
    sentence), and (2) PipeWire's WebRTC echo-cancel module proved unreliable
    to wire up on this machine (the virtual echo-cancelled source produced
    silence). A software mute sidesteps both problems entirely, at the cost
    of not supporting real barge-in (the user can't interrupt the coach
    mid-sentence) -- an explicit, accepted tradeoff for this validation spike.
    """

    COOLDOWN_SECS = 0.5

    def __init__(self) -> None:
        super().__init__()
        self._muted_until: float | None = None  # None = not muted; float = muted until this loop time
        self._bot_speaking = False

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, BotStartedSpeakingFrame):
            self._bot_speaking = True
            self._muted_until = None
            print("[coach] muting mic (bot started speaking)")
        elif isinstance(frame, BotStoppedSpeakingFrame):
            self._bot_speaking = False
            self._muted_until = asyncio.get_event_loop().time() + self.COOLDOWN_SECS
            print(f"[coach] bot stopped -- mic stays muted for {self.COOLDOWN_SECS}s cooldown")

        if isinstance(frame, InputAudioRawFrame):
            now = asyncio.get_event_loop().time()
            muted = self._bot_speaking or (self._muted_until is not None and now < self._muted_until)
            if muted:
                return  # drop the frame -- do not push downstream
            if self._muted_until is not None and now >= self._muted_until:
                self._muted_until = None
                print("[coach] mic unmuted")

        await self.push_frame(frame, direction)


# Hardcoded single task for the spike -- real task selection against Convex's
# active-task list is design doc Next Steps step 4, not this throwaway step.
SPIKE_TASK = {"name": "call your best friend", "reason": "you haven't talked in a week"}

SYSTEM_PROMPT = f"""Tu es un coach vocal chaleureux et concis pour l'application de tâches What Now.
Tu dois TOUJOURS répondre en français, quelle que soit la langue de l'utilisateur ou des données de tâche.

Voici la tâche à proposer (les détails ci-dessous sont en anglais -- traduis-les
en français avant de les prononcer, ne les répète jamais en anglais) :
name: "{SPIKE_TASK['name']}"
reason: "{SPIKE_TASK['reason']}"

Annonce cette tâche en une phrase courte et demande si la personne est prête à
la faire maintenant, veut la reporter, veut une autre tâche, ou l'a déjà faite.
Chaque réponse doit tenir en 2 phrases maximum -- c'est prononcé à voix haute."""


def _find_pipewire_device_index() -> int | None:
    """Find PyAudio's index for the "pipewire" ALSA-compatible meta-device.

    PyAudio's "default" device (ALSA's `default` PCM) does not reliably
    route through the same PipeWire default-source selection that `wpctl`/
    `pw-record` use -- on this machine it silently resolved to a device that
    never captured any audio, with no error, while `pw-record --target
    <source-id>` worked fine. The "pipewire" meta-device (a full ALSA
    passthrough to the actual PipeWire server) is the one that matches
    `pw-record`'s behavior, so this looks it up by name instead of trusting
    "default", and instead of hardcoding an index (device indices shift
    between runs as USB devices connect/disconnect).
    """
    import pyaudio

    p = pyaudio.PyAudio()
    try:
        for i in range(p.get_device_count()):
            if p.get_device_info_by_index(i)["name"] == "pipewire":
                return i
    finally:
        p.terminate()
    return None


def _log_audio_device(index: int | None) -> None:
    import pyaudio

    p = pyaudio.PyAudio()
    try:
        if index is None:
            print("[coach] WARNING: no 'pipewire' PyAudio device found, falling back to PortAudio default")
            in_dev = p.get_default_input_device_info()
            out_dev = p.get_default_output_device_info()
            print(f"[coach] fallback default input device:  {in_dev['index']} {in_dev['name']}")
            print(f"[coach] fallback default output device: {out_dev['index']} {out_dev['name']}")
        else:
            dev = p.get_device_info_by_index(index)
            print(f"[coach] using device {index} '{dev['name']}' for both input and output (routes through PipeWire)")
    finally:
        p.terminate()


async def main() -> None:
    device_index = _find_pipewire_device_index()
    _log_audio_device(device_index)

    transport = LocalAudioTransport(
        LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            input_device_index=device_index,
            output_device_index=device_index,
        )
    )

    # VADProcessor must be an explicit pipeline stage in this Pipecat version
    # (1.7.0) -- passing vad_analyzer= to LocalAudioTransportParams above is
    # silently ignored (it's not even a field on that model; confirmed via
    # LocalAudioTransportParams.model_fields). Without this, raw audio flows
    # through fine but nothing ever segments it into an utterance, so STT
    # never finalizes anything and the LLM/TTS never fire -- this was the
    # actual root cause of "no reaction to my voice."
    vad = VADProcessor(vad_analyzer=SileroVADAnalyzer())

    # device="cpu" forced: "auto" (the default) detects the GPU and tries
    # CUDA via ctranslate2, which needs libcublas.so.12 -- not installed on
    # this machine, and it fails silently into an ErrorFrame rather than
    # raising at startup, so every utterance just vanishes with no
    # transcription. CPU is plenty fast for the "base" model on short
    # utterances; revisit if a bigger local STT model is ever needed.
    # language=Language.FR: the coach speaks French now, so the user's
    # replies are expected to be French too -- without this, Whisper
    # auto-detects language per utterance, which is unreliable on short
    # phrases and can misfire into English or another language mid-session.
    stt = WhisperSTTService(
        device="cpu", settings=WhisperSTTService.Settings(model=Model.BASE, language=Language.FR)
    )
    # num_ctx capped at 2048: the model's 64k default context window doesn't
    # fit alongside the model weights in a 12GB card, forcing partial CPU
    # offload and ~5-6s latency per call. These coach prompts are short and
    # never need anywhere near 64k tokens -- capping it keeps the whole model
    # resident in VRAM, dropping warm latency to ~130ms/call (measured on an
    # RTX 4070 SUPER, 2026-08-06).
    #
    # num_ctx must go through extra_body, not extra directly: `extra` gets
    # merged flat into the OpenAI-SDK call's kwargs (OLLamaLLMService talks
    # to Ollama via its OpenAI-compatible endpoint), and num_ctx isn't a
    # real OpenAI API parameter -- the SDK rejects it outright. extra_body
    # is openai-python's standard escape hatch for provider-specific fields,
    # and Ollama's OpenAI-compat layer reads Ollama-specific options from
    # extra_body["options"].
    llm = OLLamaLLMService(
        settings=OllamaLLMSettings(model="llama3.2", extra={"extra_body": {"options": {"num_ctx": 2048}}})
    )
    # voice is required -- KokoroTTSService() with no voice throws
    # "Kokoro TTS voice must be specified" as a runtime ErrorFrame (not a
    # constructor error), so this failed silently deep in the pipeline
    # rather than at startup. ff_siwis is Kokoro's only French voice
    # (female); full list via kokoro_onnx.Kokoro.get_voices(). language
    # must also be set explicitly -- same "required or it errors at
    # runtime, not construction" gotcha as voice.
    #
    # language="fr-fr" as a raw string, NOT Language.FR: Pipecat's own
    # language_to_kokoro_language() maps Language.FR (and Language.FR_FR)
    # to the bare code "fr", but this machine's espeak-ng/phonemizer
    # backend only recognizes region-qualified codes ("fr-fr", "fr-be",
    # "fr-ch") -- "fr" alone raises "language fr is not supported by the
    # espeak backend". KokoroTTSService's actual synthesis call passes
    # `self._settings.language` straight through to kokoro_onnx without
    # going through that mapping function, so a raw string bypasses the
    # bug entirely. Confirmed directly against kokoro_onnx.Kokoro.create().
    tts = KokoroTTSService(settings=KokoroTTSService.Settings(voice="ff_siwis", language="fr-fr"))

    context = LLMContext([{"role": "system", "content": SYSTEM_PROMPT}])
    context_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            RawAudioFrameCounter(),
            MuteWhileBotSpeaking(),
            vad,
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    # Auto-stop after STOP_AFTER_TURNS full exchanges instead of relying on
    # Ctrl+C -- live testing showed the graceful-shutdown path (both
    # Pipecat's own SIGINT handler and our own finally block) occasionally
    # never completes after an interrupt, for reasons not fully root-caused.
    # Stopping ourselves from inside the running pipeline sidesteps signal
    # handling entirely.
    STOP_AFTER_TURNS = 3
    timing_log = TimingLog(script_start=_SCRIPT_START, stop_after_turns=STOP_AFTER_TURNS)

    # atexit as a second safety net regardless: fires on any normal
    # interpreter shutdown (including an unhandled KeyboardInterrupt
    # reaching the top level, if the user does Ctrl+C anyway).
    # print_summary() is idempotent, so this never double-prints.
    atexit.register(timing_log.print_summary)

    task = PipelineTask(
        pipeline,
        params=PipelineParams(allow_interruptions=False),
        observers=[TimingObserver(timing_log)],
    )
    timing_log.on_stop_condition_met = lambda: asyncio.create_task(
        task.cancel(reason=f"auto-stop after {STOP_AFTER_TURNS} exchanges")
    )

    runner = PipelineRunner()
    try:
        await runner.run(task)
    finally:
        timing_log.print_summary()


if __name__ == "__main__":
    asyncio.run(main())
