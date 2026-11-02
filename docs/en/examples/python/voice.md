---
title: Voice
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Voice

Audio capture, playback and hardware control. Semantic features (transcripts, intents, synthesized speech) live in the `robot.skills.voice_aiui` skill, see [Skills & Extensions](../../usage/skills.md). The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the API in [Voice](../../reference/python/voice.md).

## Play an audio file

`play_audio` returns a long-running Operation; `uri` is the audio resource.

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["voice"])

    op = robot.voice.play_audio("https://example.com/prompt.wav")
    snap = op.get(timeout=30.0)
    print(snap.state is OperationState.Succeeded, snap.result)
```

Playback holds the `speaker` resource with policy `reject`, so only one playback session runs at a time.

## Capture a speech segment

`listen` returns a cancelable Operation and the audio chunks arrive on the `capture()` channel. The terminal result is a `CaptureSummary` (`voiced` / `bytes` / `duration_ms` / `reason`), where `reason` is a `CaptureEnd`.

```python
from fabot.capabilities.voice import CaptureEnd

ch = robot.voice.capture(qos_profile="realtime")
op = robot.voice.listen(session_id="demo-1", wake_cue=True, max_seconds=5.0)

audio = bytearray()
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=8000):
        audio.extend(frame.payload.data)
finally:
    ch.close()

snap = op.get(timeout=10.0)
if snap.result is not None:
    print(snap.result.voiced, snap.result.bytes, snap.result.reason)
```

Capture holds both `speaker` and `microphone` with policy `reject`, so you cannot play while capturing.

## Streaming playback (you produce the audio)

When you synthesize audio yourself, open a session with `begin_playback`, push chunks with `write_audio`, and read playback events from the `playback()` channel:

```python
ch = robot.voice.playback(qos_profile="realtime")
robot.voice.begin_playback(session_id="tts-1", sample_rate=16000, channels=1)
robot.voice.write_audio(session_id="tts-1", sequence=0, final=True, data=list(pcm_bytes))
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.state)     # PlaybackState
    break
ch.close()
```

## Volume, mute and wake word

```python
robot.voice.set_volume(0.7)
robot.voice.set_mute(False)
robot.voice.set_wakeword_enabled(True)

status = robot.voice.get_status().status
print(status.activity, status.volume, status.muted, status.wakeword_enabled)
```

## Subscribe to wake and playback events

```python
def on_wake(event):
    print("wake word:", event.audio_wake_word_detected.keyword)

token = robot.voice.events.audio_wake_word_detected.subscribe(on_wake)
```

The `wake()` channel also pushes `WakeEvent`; `capture()` pushes `CaptureChunk` and `playback()` pushes `PlaybackEvent`.

## Semantic speech with the skill

The voice hardware is complemented by the semantic skill, whose `speak` synthesizes in the cloud and plays through the speaker:

```python
aiui = robot.skills.voice_aiui
if aiui.is_available:
    aiui.speak("Okay, heading to the charging dock.").wait(timeout=15.0)
```
