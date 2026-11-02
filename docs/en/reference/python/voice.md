---
title: Voice
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Voice

## Module Overview

- Capability id: `voice`; slots: `robot.voice`
- Domain: `interaction`; capability version: `1.1.0`
- Voice hardware capability: status and volume, wake word, microphone capture and speaker playback, all stream-oriented.
- Capture uses `listen` plus the `capture()` channel; playback uses `play_audio` or `begin_playback` with `write_audio` and the `playback()` channel.

Semantic features (transcripts, intents, speech synthesis) live in the `robot.skills.voice_aiui` skill, not this module; see [Skills & Extensions](../../usage/skills.md).

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `stop` | `Empty` | `VoiceStatusApplied` | 1000 ms |
| `set_volume` | `Volume` | `VoiceStatusApplied` | 3000 ms |
| `set_mute` | `Mute` | `VoiceStatusApplied` | 1000 ms |
| `set_wakeword_enabled` | `Wakeword` | `VoiceStatusApplied` | 1000 ms |
| `get_status` | `Empty` | `VoiceStatusApplied` | 1000 ms |
| `stop_capture` | `CaptureControl` | `CaptureAccepted` | 3000 ms |
| `begin_playback` | `PlaybackOptions` | `PlaybackAccepted` | 3000 ms |
| `write_audio` | `PlaybackChunk` | `PlaybackAccepted` | 3000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `listen` | `CaptureOptions` | Operation | speaker, microphone | 60000 ms |
| `play_audio` | `AudioPlayback` | Operation | speaker | 30000 ms |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `wake()` | `WakeEvent` |
| `capture()` | `CaptureChunk` |
| `playback()` | `PlaybackEvent` |

Enums used on this page:

**`CaptureEnd` enum**

| Value | Description |
|-------|-------------|
| `SILENCE` | Ended on silence |
| `MAX_DURATION` | Reached the maximum duration |
| `NO_SPEECH` | No speech detected |
| `STOPPED` | Stopped by the caller |
| `FAILED` | Failed |

**`PlaybackState` enum**

| Value | Description |
|-------|-------------|
| `STARTED` | Playback started |
| `FINISHED` | Playback finished |
| `INTERRUPTED` | Interrupted |
| `FAILED` | Failed |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### stop

Stop the current playback or capture.

```python
stop(*, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `VoiceStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `VoiceStatus` | Status snapshot |

### set_volume

Set the volume from 0 to 1.

```python
set_volume(volume: float, *, timeout_ms: int = 3000) -> VoiceStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `volume` | `float` | (required) | Volume from 0 to 1 |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `VoiceStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `VoiceStatus` | Status snapshot |

### set_mute

Mute or unmute.

```python
set_mute(muted: bool, *, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `muted` | `bool` | (required) | Whether muted |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `VoiceStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `VoiceStatus` | Status snapshot |

### set_wakeword_enabled

Enable or disable the wake word.

```python
set_wakeword_enabled(enabled: bool, *, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `enabled` | `bool` | (required) | Whether enabled |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `VoiceStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `VoiceStatus` | Status snapshot |

### get_status

Read the voice status snapshot; `get_state` is an alias.

```python
get_status(*, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `VoiceStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `VoiceStatus` | Status snapshot |

### stop_capture

Stop the given capture session.

```python
stop_capture(*, session_id: str, timeout_ms: int = 3000) -> CaptureAccepted
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `session_id` | `str` | (required) | Session id |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `CaptureAccepted`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `session_id` | `str` | Session id; capture and playback calls must agree |
| `accepted` | `bool` | Whether accepted |

### begin_playback

Begin a streaming playback session, then push chunks with `write_audio`.

```python
begin_playback(*, session_id: str, sample_rate: int = 16000, channels: int = 1, timeout_ms: int = 3000) -> PlaybackAccepted
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `session_id` | `str` | (required) | Session id |
| `sample_rate` | `int` | `16000` | Sample rate in hertz |
| `channels` | `int` | `1` | Channel count |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `PlaybackAccepted`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `session_id` | `str` | Session id; capture and playback calls must agree |
| `accepted` | `bool` | Whether accepted |
| `buffered_bytes` | `int` | Buffered byte count |

### write_audio

Write one audio chunk; `final=True` marks the last.

```python
write_audio(*, session_id: str, sequence: int, final: bool, data: list[int], timeout_ms: int = 3000) -> PlaybackAccepted
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `session_id` | `str` | (required) | Session id |
| `sequence` | `int` | (required) | Sequence number |
| `final` | `bool` | (required) | Whether this is the last chunk |
| `data` | `list[int]` | (required) | Audio bytes |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `PlaybackAccepted`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `session_id` | `str` | Session id; capture and playback calls must agree |
| `accepted` | `bool` | Whether accepted |
| `buffered_bytes` | `int` | Buffered byte count |

### listen

Capture a speech segment and return a cancelable Operation whose terminal result is a `CaptureSummary`.

```python
listen(*, session_id: str, wake_cue: bool = True, max_seconds: float = 0.0) -> ListenOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `session_id` | `str` | (required) | Session id |
| `wake_cue` | `bool` | `True` | Whether to play a wake cue |
| `max_seconds` | `float` | `0.0` | Maximum capture length in seconds |

Returns a `ListenOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
from fabot.core import OperationState
from fabot.capabilities.voice import CaptureEnd

ch = robot.voice.capture(qos_profile="realtime")
op = robot.voice.listen(session_id="demo-1", wake_cue=True, max_seconds=5.0)

captured = bytearray()
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=8000):
    captured.extend(frame.payload.data)

snap = op.get(timeout=10.0)
if snap.state is OperationState.Succeeded:
    print(snap.result.voiced, snap.result.bytes, snap.result.reason)   # reason 为 CaptureEnd
ch.close()
```

### play_audio

Play an audio resource and return a cancelable Operation.

```python
play_audio(uri: str) -> PlayAudioOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `uri` | `str` | (required) | Resource URI |

Returns a `PlayAudioOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### wake()

Wake-word stream.

```python
wake(qos_profile: str = "latest") -> Channel
```

Frame payload is `WakeEvent`:

| Field | Type | Description |
|------|------|------|
| `keyword` | `str` | Matched wake word |
| `timestamp_us` | `int` | Sample timestamp in microseconds |

### capture()

Captured audio chunk stream.

```python
capture(qos_profile: str = "latest") -> Channel
```

Frame payload is `CaptureChunk`:

| Field | Type | Description |
|------|------|------|
| `session_id` | `str` | Session id; capture and playback calls must agree |
| `sequence` | `int` | Sequence number increasing from 0 |
| `sample_rate` | `int` | Sample rate in hertz |
| `channels` | `int` | Channel count |
| `timestamp_us` | `int` | Sample timestamp in microseconds |
| `data` | `list[int]` | Audio bytes |

### playback()

Playback event stream.

```python
playback(qos_profile: str = "latest") -> Channel
```

Frame payload is `PlaybackEvent`:

| Field | Type | Description |
|------|------|------|
| `session_id` | `str` | Session id; capture and playback calls must agree |
| `state` | `PlaybackState` | State value |
| `timestamp_us` | `int` | Sample timestamp in microseconds |

## Events

Subscribe through `robot.<slot>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

| Entry | Event type | payload |
|------|------|------|
| `robot.<slot>.events.audio_wake_word_detected` | `AudioWakeWordDetectedEvent` | `audio_wake_word_detected` |
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`: `Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot` |

### audio_wake_word_detected

Pushed when the wake word fires; the payload is a `WakeEvent` (`keyword` / `timestamp_us`).

## Faults

Query with `robot.<slot>.faults()`, which returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`: 

| Field | Type | Description |
|------|------|------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

For human-readable fault text use `Catalogs.format_fault(record, capability_id="...")`; see [Catalogs](../../usage/catalogs.md).

## Status

`status()` returns the read-only status bag for this capability; see `robot.status()` for the aggregated view.

| Field | Type | Default | Description |
|------|------|------|------|
| `activity` | `str` | `idle` | `idle` / `listening` / `speaking` |

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

Capture holds `speaker` plus `microphone`; playback holds only `speaker`. Both use policy `reject`, so only one session runs at a time and conflicts fail immediately.
