"""Standalone PyAudio capture test, no Pipecat involved.

Opens the same device index the spike uses (found by name "pipewire") and
prints the RMS volume of each captured chunk for 8 seconds. Talk during
that window -- if the numbers stay near zero the whole time, PyAudio isn't
actually receiving audio from this device, independent of anything Pipecat
or Whisper related.
"""

import audioop
import time

import pyaudio


def find_pipewire_index(p: pyaudio.PyAudio) -> int | None:
    for i in range(p.get_device_count()):
        if p.get_device_info_by_index(i)["name"] == "pipewire":
            return i
    return None


def main() -> None:
    p = pyaudio.PyAudio()
    index = find_pipewire_index(p)
    print(f"using device index: {index}")

    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=16000,
        input=True,
        input_device_index=index,
        frames_per_buffer=1024,
    )

    print("Recording for 8 seconds. Talk now.")
    start = time.time()
    while time.time() - start < 8:
        data = stream.read(1024, exception_on_overflow=False)
        rms = audioop.rms(data, 2)
        bar = "#" * min(rms // 50, 60)
        print(f"rms={rms:5d} {bar}")

    stream.stop_stream()
    stream.close()
    p.terminate()


if __name__ == "__main__":
    main()
