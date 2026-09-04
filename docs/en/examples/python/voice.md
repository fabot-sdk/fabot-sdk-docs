---
title: Voice
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Voice

Text-to-speech playback and speech transcript subscription. For the long-running operation model see [Commands and Operations](../../usage/commands-operations.md); for channel usage see [Events and Channels](../../usage/events-channels.md); for the API see [Voice](../../reference/python/voice.md).

## Synthesize and speak a sentence

`list_speakers()` lists the available speakers; `speak` returns a long-running Operation — poll its state with `events()` until a terminal snapshot, then read the result. Both `text` and `speaker_id` are required keyword arguments; pass an empty `speaker_id` to keep the current speaker.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["voice"])

    speakers = robot.voice.list_speakers().speakers
    for spk in speakers:
        print(spk.speakerId, spk.locale, spk.gender)

    speaker_id = speakers[0].speakerId if speakers else ""
    op = robot.voice.speak(text="Hello, I am a robot", speaker_id=speaker_id)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        print("state:", snap.state)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("done:", snap.result.statusMessage)
    else:
        print("failed:", snap.error)
```

Notes:

- `speak` and `play_audio` share the same playback resource: starting a new task while one is in progress is **rejected** (not queued). Use `op.cancel()` to cancel, or `robot.voice.stop()` to interrupt the current output.
- Adjust the output beforehand with Commands such as `robot.voice.set_volume(volume=0.6)` or `robot.voice.set_speaking_rate(speaking_rate=1.2)`; the returned `status` is the applied state snapshot — see [Voice](../../reference/python/voice.md) for its fields.

## Subscribe to speech transcripts

`transcript()` opens the transcript channel; iterate frames with `frames()` and always `close()` when done:

```python
ch = robot.voice.transcript(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=10000):
        p = frame.payload
        if p.isFinal:
            print("final:", p.text, "confidence:", p.confidence)
        else:
            print("partial:", p.text)
finally:
    ch.close()
```

`payload` is a `TranscriptEventT` (`text` / `isFinal` / `confidence` / `timestampUs`); frames with `isFinal == False` are intermediate results. Wake-word and intent recognition use the `wake()` / `intent()` channels opened the same way — see [Voice](../../reference/python/voice.md).

## See also

- [Commands and Operations](../../usage/commands-operations.md)
- [Events and Channels](../../usage/events-channels.md)
- [Voice API reference](../../reference/python/voice.md)
