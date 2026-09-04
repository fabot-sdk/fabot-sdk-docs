---
title: Voice
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Voice

## Module Overview

- Capability id: `voice`; slot: `robot.voice`
- Voice interaction: wake, transcription, and intent recognition arrive on data channels (input side); speech synthesis, audio playback, and volume / mute / speaking-rate / speaker control go through methods and Operations (output side).

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `stop` | — | `VoiceStatusAppliedT` | Command |
| `set_volume` | `volume` | `VoiceStatusAppliedT` | Command |
| `set_mute` | `muted` | `VoiceStatusAppliedT` | Command |
| `set_speaker` | `speaker_id` | `VoiceStatusAppliedT` | Command |
| `list_speakers` | — | `SpeakerListT` | Command |
| `set_speaking_rate` | `speaking_rate` | `VoiceStatusAppliedT` | Command |
| `set_wakeword_enabled` | `enabled` | `VoiceStatusAppliedT` | Command |
| `get_status` | — | `VoiceStatusAppliedT` | Command |
| `speak` | `text`, `speaker_id` | `SpeakOperation` | Operation |
| `play_audio` | `uri` | `PlayAudioOperation` | Operation |

Command default `timeout_ms`: 3000 for `set_volume` / `list_speakers`, 1000 for the other Commands (all overridable). `speak` / `play_audio` default to a 30000 ms timeout and are cancelable. All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `wake()` | Wake-event stream (`WakeEventT`) |
| `transcript()` | Speech-transcript stream (`TranscriptEventT`) |
| `intent()` | Intent-recognition stream (`IntentEventT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### stop

Interrupt the current voice output, ending any in-flight `speak` / `play_audio` task.

```python
stop(*, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT` (shared by all write commands and `get_status`):

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `status` | `VoiceStatusT` | Voice-state snapshot after the change is applied |

`VoiceStatusT` fields:

| Field | Type | Description |
|-------|------|-------------|
| `activity` | `int` (`VoiceActivity`) | Current activity: `UNKNOWN` / `IDLE` / `LISTENING` / `SPEAKING` |
| `volume` | `float` | Linear gain in [0.0, 1.0] |
| `muted` | `bool` | Whether output is muted |
| `speakerId` | `str` | Current speaker id; empty string means unset |
| `speakingRate` | `float` | Speaking-rate multiplier; 1.0 is the default |
| `wakewordEnabled` | `bool` | Whether wakeword detection is on |

```python
applied = robot.voice.stop()
print(applied.outcome.success, applied.status.activity)
```

### set_volume

Set the volume (linear gain). Volume and mute are independent: volume 0.0 is not mute.

```python
set_volume(*, volume: float, timeout_ms: int = 3000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `volume` | `float` | (required) | Linear gain; legal range [0.0, 1.0], out of range raises `InvalidArgument` |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.set_volume(volume=0.6)
print(applied.outcome.success, applied.status.volume)
```

### set_mute

Mute or unmute. Unmuting restores the last non-muted volume.

```python
set_mute(*, muted: bool, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `muted` | `bool` | (required) | `True` mutes; `False` unmutes |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.set_mute(muted=True)
print(applied.outcome.success, applied.status.muted)
```

### set_speaker

Switch the current speaker. See `list_speakers()` for the available speakers.

```python
set_speaker(*, speaker_id: str, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `speaker_id` | `str` | (required) | Speaker id |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.set_speaker(speaker_id="zh-CN-female-1")
print(applied.outcome.success, applied.status.speakerId)
```

### list_speakers

List the selectable speakers.

```python
list_speakers(*, timeout_ms: int = 3000) -> SpeakerListT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`SpeakerListT`:

| Field | Type | Description |
|-------|------|-------------|
| `speakers` | `list[SpeakerInfoT]` | Speaker list; each entry has `speakerId` / `locale` (e.g. `zh-CN`) / `gender` — the latter two are empty when unknown |
| `outcome` | `OutcomeT` | `success` / `statusMessage` |

```python
result = robot.voice.list_speakers()
for spk in result.speakers:
    print(spk.speakerId, spk.locale, spk.gender)
```

### set_speaking_rate

Set the speaking-rate multiplier. Independent of volume.

```python
set_speaking_rate(*, speaking_rate: float, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `speaking_rate` | `float` | (required) | Rate multiplier; 1.0 is the default. Legal range (0.0, 3.0], out of range raises `InvalidArgument` |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.set_speaking_rate(speaking_rate=1.2)
print(applied.outcome.success, applied.status.speakingRate)
```

### set_wakeword_enabled

Enable or disable wakeword detection.

```python
set_wakeword_enabled(*, enabled: bool, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `bool` | (required) | `True` enables; `False` disables |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.set_wakeword_enabled(enabled=False)
print(applied.outcome.success, applied.status.wakewordEnabled)
```

### get_status

Read the current voice-state snapshot as a Command.

```python
get_status(*, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`VoiceStatusAppliedT`: `outcome` / `status`; see [stop](#stop) for the fields.

```python
applied = robot.voice.get_status()
print(applied.status.volume, applied.status.muted, applied.status.speakerId)
```

### speak

Synthesize text and play it. Returns a pollable, cancelable Operation.

```python
speak(*, text: str, speaker_id: str) -> SpeakOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `str` | (required) | Text to synthesize and speak |
| `speaker_id` | `str` | (required) | Speaker id for this utterance only; an empty string keeps the current speaker |

**Returns**

`SpeakOperation`. Use `get()` / `events()` for snapshots, or `cancel()`. Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether the snapshot is terminal |
| `feedback` | `EmptyT` \| `None` | No progress content |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | Failure reason |

```python
op = robot.voice.speak(text="Hello, world", speaker_id="")
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state)
    if snap.terminal:
        break
```

### play_audio

Play an audio resource. Returns a pollable, cancelable Operation.

```python
play_audio(*, uri: str) -> PlayAudioOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `uri` | `str` | (required) | Audio-resource URI, e.g. a `file://` local file |

**Returns**

`PlayAudioOperation`. Snapshot fields match `speak`: `state` / `feedback: EmptyT` / `result: OutcomeT` / `error`. The handle supports `cancel()`.

```python
op = robot.voice.play_audio(uri="file:///opt/fabot/media/ding.wav")
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### wake()

Subscribe to the wake-event stream.

```python
wake(qos_profile: str = "latest") -> WakeChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`WakeChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `WakeEventT` | `payload.keyword` (`str`): matched wakeword; `payload.timestampUs` (`int`): event timestamp (microseconds) |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.voice.wake(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.keyword)
```

### transcript()

Subscribe to the speech-transcript stream.

```python
transcript(qos_profile: str = "latest") -> TranscriptChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`TranscriptChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `TranscriptEventT` | See below |

`TranscriptEventT` fields:

| Field | Type | Description |
|-------|------|-------------|
| `text` | `str` | Transcribed text |
| `isFinal` | `bool` | Whether this is a final result (`False` = interim) |
| `confidence` | `float` | Confidence |
| `timestampUs` | `int` | Event timestamp (microseconds) |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.voice.transcript(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    if frame.payload.isFinal:
        print(frame.payload.text, frame.payload.confidence)
```

### intent()

Subscribe to the intent-recognition stream.

```python
intent(qos_profile: str = "latest") -> IntentChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`IntentChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `IntentEventT` | See below |

`IntentEventT` fields:

| Field | Type | Description |
|-------|------|-------------|
| `intentId` | `str` | Intent id |
| `transcript` | `str` | Corresponding transcript text |
| `confidence` | `float` | Confidence |
| `timestampUs` | `int` | Event timestamp (microseconds) |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.voice.intent(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.intentId, frame.payload.confidence)
```

## Events

Subscribe via `robot.voice.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

This module has no module-specific event streams; wake, transcript, and intent arrive on data channels — see [Channels](#channels).

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.voice.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.voice.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.voice.events.lifecycle_changed.subscribe(callback)`.

**Payload**

`LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot`:

| Field | Type | Description |
|-------|------|-------------|
| `lifecycle` | `LifecycleState` | Lifecycle stage |
| `health` | `HealthState` | Health |
| `source_instance_id` | `str` | Source instance id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.voice.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.voice.faults()`, which returns `Faults`.

This module has no named faults yet: `Faults` currently only exposes `revision`. Changes are pushed on `fault_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md) for the shared model.

If named faults appear later, each one is a `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `active` | `bool` | Whether the fault is still standing |
| `catalog_id` | `str` | Catalog id |
| `fault_class` | `CapabilityStateClass` | Fault class |
| `first_seen_us` / `last_seen_us` | `int` | First / last seen timestamp (microseconds) |
| `count` | `int` | Occurrence count |

## Status

`status()` returns `Status`:

| Field | Type | Description |
|-------|------|-------------|
| `activity` | `Activity` | Voice activity: `Activity.Idle` / `Activity.Listening` / `Activity.Speaking` |

```python
st = robot.voice.status()
print(st.activity)
```

`status()` only carries `activity`; for the full snapshot (volume, mute, speaker, etc.) use the `get_status()` Command — see [Methods](#methods). For aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

`speak` and `play_audio` share one speaker resource: while a speak or playback task is running, a new task is **rejected** (not queued). Both Operations default to a 30 s timeout and support `cancel()`; they can also be interrupted with the `stop` command, which does not take the resource.
