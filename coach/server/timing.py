"""Wall-clock timing instrumentation for the voice coach spike.

Watches every frame that flows through the pipeline (via Pipecat's
non-intrusive BaseObserver API -- no pipeline wiring changes needed) and
records a timestamped event log: listening start/stop, STT start/stop,
agent query start/first-token/stop, TTS start/stop, playback start/stop.
Prints a full chronological timeline plus a "longest steps" breakdown when
the session ends.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    TranscriptionFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.observers.base_observer import BaseObserver, FramePushed

# Frame type -> event label. Order here is only for readability; actual
# ordering in the timeline comes from real timestamps.
_EVENT_LABELS: dict[type[Frame], str] = {
    VADUserStartedSpeakingFrame: "listening_start",
    VADUserStoppedSpeakingFrame: "listening_stop",
    TranscriptionFrame: "stt_stop",
    LLMFullResponseStartFrame: "agent_query_start",
    LLMFullResponseEndFrame: "agent_query_stop",
    TTSStartedFrame: "tts_start",
    TTSStoppedFrame: "tts_stop",
    BotStartedSpeakingFrame: "playing_start",
    BotStoppedSpeakingFrame: "playing_stop",
}

# listening_stop doubles as stt_start: Whisper's STT run is triggered
# directly off VADUserStoppedSpeakingFrame internally (see
# pipecat/services/stt_service.py _handle_vad_user_stopped_speaking), so
# there's no separate frame marking "STT processing began" -- it's the
# same instant.
_STT_START_ALIAS = "listening_stop"


@dataclass
class TimingEvent:
    turn: int
    label: str
    t: float  # seconds since script start


@dataclass
class TimingLog:
    script_start: float
    events: list[TimingEvent] = field(default_factory=list)
    _seen_frame_ids: set[int] = field(default_factory=set)
    _turn: int = 0
    _first_token_seen_this_turn: bool = False
    _summary_printed: bool = False
    stop_after_turns: int | None = None
    on_stop_condition_met: object = None  # Callable[[], None], set by caller

    def record(self, label: str, frame_id: int | None = None) -> None:
        if frame_id is not None:
            key = (label, frame_id)
            if key in self._seen_frame_ids:
                return  # dedupe: the same frame instance is pushed through every processor link
            self._seen_frame_ids.add(key)

        if label == "listening_start":
            self._turn += 1
            self._first_token_seen_this_turn = False

        now = time.time() - self.script_start
        self.events.append(TimingEvent(turn=self._turn, label=label, t=now))
        print(f"[timing] t={now:7.3f}s turn={self._turn} {label}")

        # playing_stop marks a full exchange (task announced/replied, user
        # heard the response) as complete. Auto-stopping here instead of
        # relying on Ctrl+C sidesteps the flaky signal-handling behavior
        # observed during live testing (graceful shutdown occasionally
        # never completed after an interrupt).
        if (
            label == "playing_stop"
            and self.stop_after_turns is not None
            and self._turn >= self.stop_after_turns
            and self.on_stop_condition_met is not None
        ):
            self.on_stop_condition_met()

    def record_pipeline_ready(self) -> None:
        self.record("pipeline_ready")

    def maybe_record_first_token(self, frame_id: int) -> None:
        if self._first_token_seen_this_turn:
            return
        self._first_token_seen_this_turn = True
        self.record("agent_first_token", frame_id)

    def print_summary(self) -> None:
        if self._summary_printed:
            return  # called from both the normal shutdown path and an atexit
            # safety net -- print once regardless of which one fires first.
        self._summary_printed = True

        if not self.events:
            print("[timing] no events recorded")
            return

        print("\n" + "=" * 72)
        print("TIMELINE")
        print("=" * 72)
        prev_t = 0.0
        for e in self.events:
            delta = e.t - prev_t
            print(f"  t={e.t:7.3f}s  (+{delta:6.3f}s)  turn={e.turn}  {e.label}")
            prev_t = e.t

        print("\n" + "=" * 72)
        print("STEP DURATIONS (per turn, longest first)")
        print("=" * 72)

        by_turn: dict[int, dict[str, float]] = {}
        for e in self.events:
            by_turn.setdefault(e.turn, {})[e.label] = e.t

        # (label pairs defining a "step" -- start label, end label, display name)
        steps = [
            ("listening_start", "listening_stop", "listening (user speaking)"),
            (_STT_START_ALIAS, "stt_stop", "speech-to-text"),
            ("agent_query_start", "agent_first_token", "agent time-to-first-token"),
            ("agent_query_start", "agent_query_stop", "agent full response"),
            ("tts_start", "tts_stop", "text-to-speech synthesis"),
            ("playing_start", "playing_stop", "audio playback"),
            ("stt_stop", "agent_query_start", "gap: stt done -> agent query start"),
            ("agent_query_stop", "tts_start", "gap: agent done -> tts start"),
        ]

        all_durations: list[tuple[float, str, int]] = []
        for turn, labels in sorted(by_turn.items()):
            if turn == 0:
                continue  # pipeline_ready fires before any turn
            print(f"\n  Turn {turn}:")
            turn_durations: list[tuple[float, str]] = []
            for start_label, end_label, name in steps:
                if start_label in labels and end_label in labels:
                    dur = labels[end_label] - labels[start_label]
                    if dur >= 0:
                        turn_durations.append((dur, name))
                        all_durations.append((dur, name, turn))
            for dur, name in sorted(turn_durations, reverse=True):
                print(f"    {dur:7.3f}s  {name}")

        if all_durations:
            print("\n" + "=" * 72)
            print("LONGEST STEPS ACROSS THE WHOLE SESSION")
            print("=" * 72)
            for dur, name, turn in sorted(all_durations, reverse=True)[:10]:
                print(f"  {dur:7.3f}s  turn {turn:2d}  {name}")
        print("=" * 72 + "\n")


class TimingObserver(BaseObserver):
    def __init__(self, log: TimingLog) -> None:
        super().__init__()
        self._log = log

    async def on_push_frame(self, data: FramePushed) -> None:
        frame = data.frame
        frame_type = type(frame)

        # Broadcast frames (VAD/turn events, in particular) are pushed as two
        # linked instances with different `id`s -- one flowing each
        # direction -- tied together via `broadcast_sibling_id`. Canonicalize
        # to the smaller of the two so both instances dedupe to one event.
        sibling_id = getattr(frame, "broadcast_sibling_id", None)
        canonical_id = min(frame.id, sibling_id) if sibling_id is not None else frame.id

        if frame_type is LLMTextFrame:
            self._log.maybe_record_first_token(canonical_id)
            return

        label = _EVENT_LABELS.get(frame_type)
        if label is not None:
            self._log.record(label, canonical_id)

    async def on_pipeline_started(self) -> None:
        self._log.record_pipeline_ready()
