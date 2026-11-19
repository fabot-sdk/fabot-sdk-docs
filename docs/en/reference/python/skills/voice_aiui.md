---
title: Voice Semantics VoiceAiui
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Voice Semantics VoiceAiui

## Module Overview

- Skill: `voice_aiui`; entry: `robot.skills.voice_aiui`
- Skill id: `fabot_voice_aiui`; config type `VoiceAiuiConfig`
- Adds transcripts, intent recognition and synthesized speech on top of the `voice` hardware capability. Microphone capture and speaker playback stay in [Voice](../voice.md); this skill handles the semantics.
- `speak` is an Operation occupying the `speaker` resource with policy `reject`, default budget 30 seconds, cancelable.

Common members (`is_available` / `handle` / `events` / `health()` / `faults()` / `ping()` / `self_check()` and config access) are in the [Skills Overview](./index.md).

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `stop` | Command | Interrupt the current playback (`StatusApplied`); default timeout 1000 ms. |
| `set_speaker` | Command | Select a speaker (`StatusApplied`); default timeout 1000 ms. |
| `list_speakers` | Command | List available speakers (`SpeakerList`); default timeout 3000 ms. |
| `set_speaking_rate` | Command | Set the speech rate multiplier (`StatusApplied`); default timeout 1000 ms. |
| `set_auto_answer` | Command | Auto-answer toggle (`SettingsApplied`); default timeout 1000 ms. |
| `set_play_intent_audio` | Command | Intent-audio toggle (`SettingsApplied`); default timeout 1000 ms. |
| `get_settings` | Command | Read settings (`SettingsApplied`); default timeout 1000 ms. |
| `get_status` | Command | Read the status snapshot (`StatusApplied`); `get_state` is an alias. |
| `speak` | Operation | Synthesize and play, returning a pollable, cancelable `SpeakOperation`. |
| `transcript` | Channel | Transcript stream; frames are `TranscriptEvent`. |
| `intent` | Channel | Intent stream; frames are `IntentEvent`. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return synchronously and `timeout_ms` can be overridden per call; Operations return a handle immediately and expose progress through snapshots, see [Commands & Operations](../../../usage/basics/commands-operations.md).

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`speaker_id`); the generated types also accept the camelCase alias.

### speak

Semantic playback: the text is synthesized in the cloud and played through the speaker. The returned `SpeakOperation` has the same shape as capability Operations.

```python
speak(text: str, *, speaker_id: str = "") -> SpeakOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `str` | (required) | Text to speak |
| `speaker_id` | `str` | `""` | Speaker id; empty keeps the current speaker |

`SpeakOperation` members:

| Member | Description |
|--------|-------------|
| `id` | Operation id |
| `get(timeout=..., timeout_ms=...)` | Fetch one `SpeakOperationSnapshot` |
| `wait(timeout=..., timeout_ms=...)` | Wait for a terminal state, returns `Outcome` (failure / cancellation / timeout raise) |
| `cancel()` | Request cancellation, returns the resulting snapshot |
| `events(...)` / iteration | Yield snapshots until `terminal` is `True` |

`SpeakOperationSnapshot` fields: `operation_id` / `state` (`OperationState`) / `terminal` / `updated_at_us` / `sequence` / `feedback` (`Empty`) / `result` (`Outcome`) / `error` (`FabotError | None`).

```python
op = robot.skills.voice_aiui.speak("Okay, heading to the charging dock.")
outcome = op.wait(timeout=30.0)
print(outcome.success, outcome.status_message)
```

### stop / set_speaker / set_speaking_rate

```python
stop(*, timeout_ms: int = 1000) -> StatusApplied
set_speaker(speaker_id: str, *, timeout_ms: int = 1000) -> StatusApplied
set_speaking_rate(speaking_rate: float, *, timeout_ms: int = 1000) -> StatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `speaker_id` | `str` | (required) | Speaker id, as returned by `list_speakers()` |
| `speaking_rate` | `float` | (required) | Speech rate multiplier; `1.0` is normal |
| `timeout_ms` | `int` | `1000` | Call timeout in milliseconds |

All three return `StatusApplied`:

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result |
| `status` | `Status` | Raw on-wire status snapshot (see `get_status`) |

`stop()` only interrupts playback in progress and does not affect microphone capture.

### list_speakers

```python
list_speakers(*, timeout_ms: int = 3000) -> SpeakerList
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Call timeout in milliseconds |

**Returns** `SpeakerList`

| Field | Type | Description |
|-------|------|-------------|
| `speakers` | `list[SpeakerInfo]` | Available speakers |
| `outcome` | `Outcome` | Call result |

`SpeakerInfo` fields: `speaker_id` / `locale` / `gender`. `speaker_id` is what `set_speaker()` and `speak()` accept, drawn from `aiui.speakers[].name` in the config or the official vcn.

### Settings

```python
set_auto_answer(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
set_play_intent_audio(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
get_settings(*, timeout_ms: int = 1000) -> SettingsApplied
get_status(*, timeout_ms: int = 1000) -> StatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `bool` | (required) | Auto-answer / intent-audio toggle |
| `timeout_ms` | `int` | `1000` | Call timeout in milliseconds |

`SettingsApplied` fields: `outcome` / `settings` (`Settings`). `Settings` fields: `auto_answer` / `play_intent_audio`.

`get_status()` returns `StatusApplied` (`outcome` + `status`), where `status` is the raw on-wire snapshot: `activity` as an enum ordinal int, plus `speaker_id` / `speaking_rate` / `auto_answer` / `play_intent_audio` / `cloud_connected` / `last_error`. For the parsed, enum-typed form use `status()`, see "Status".

`get_state` is an alias of `get_status`; both are equivalent.

## Channels

Opening a channel establishes a lease and returns a handle; iterate with `frames()`, take one frame with `next()`, extend with `renew()`, release with `close()`. General usage is in [Events & Data Channels](../../../usage/data/events-channels.md).

### transcript

Transcript stream.

```python
transcript(qos_profile: str = "latest") -> TranscriptChannel
```

Frame payload `TranscriptEvent`:

| Field | Type | Description |
|-------|------|-------------|
| `text` | `str` | Transcribed text |
| `is_final` | `bool` | Whether this is the final result for the utterance; interim results repeat |
| `confidence` | `float` | Confidence |
| `timestamp_us` | `int` | Timestamp in microseconds |

The outer `TranscriptChannelFrame` carries `channel_id` / `sequence` / `timestamp_us` / `payload`. `next()` with no arguments waits 5 seconds.

### intent

Intent stream.

```python
intent(qos_profile: str = "latest") -> IntentChannel
```

Frame payload `IntentEvent`:

| Field | Type | Description |
|-------|------|-------------|
| `intent_id` | `str` | Matched intent id |
| `transcript` | `str` | Text that triggered the intent |
| `confidence` | `float` | Confidence |
| `timestamp_us` | `int` | Timestamp in microseconds |

The outer `IntentChannelFrame` matches `TranscriptChannelFrame`.

```python
aiui = robot.skills.voice_aiui
for event in aiui.transcript().frames(poll_timeout_ms=200, timeout_ms=10000):
    if event.payload.is_final:
        print(event.payload.text, event.payload.confidence)
        break
```

## Events

Subscribe through `robot.skills.voice_aiui.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader`.

| Entry | Event type | Payload |
|-------|-----------|---------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`: `Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`: `CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | Wildcard subscription | `Event` |

Transcripts and intents do not use events; they arrive on the `transcript()` / `intent()` channels.

## Exceptions

`robot.skills.voice_aiui.faults()` returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

For human-readable text use `Catalogs.format_fault(record)`, see [Catalogs](../catalogs.md).

Call failures: when `speak` is busy it raises `ResourceConflict`; when the terminal state is failed / canceled / timed out, `wait()` raises `FabotError` / `Canceled` / `Timeout`. With cloud credentials missing the skill stays running but speech and recognition are unavailable — check `cloud_connected` and `activity` on the status. See [Error Handling](../../../usage/diagnostics/errors.md).

## Status

`status()` returns a read-only status bag; the robot-wide aggregation has no skill fields. It raises `RuntimeError` when nothing has been reported.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `activity` | `Activity` | `Idle` | `Idle` / `Listening` / `Speaking` (values `idle` / `listening` / `speaking`) |
| `speaker_id` | `str` | `""` | Current speaker |
| `speaking_rate` | `float` | `1.0` | Speech rate multiplier |
| `auto_answer` | `bool` | `False` | Auto-answer toggle |
| `play_intent_audio` | `bool` | `False` | Intent-audio toggle |
| `cloud_connected` | `bool` | `False` | Whether the cloud link is up |

Common read-only queries: `health()` returns `SlotHealth` and `lifecycle()` returns `CapabilityLifecycleSnapshot`.

## Resources

| Resource | Policy | Occupied by |
|----------|--------|-------------|
| `speaker` | `reject` | `speak` |

Only one playback at a time; a clash is rejected immediately with `ResourceConflict`. `speak` has a default budget of **30 seconds** and is cancelable. Every other method is a short Command and occupies no resource.

## Config domains

`VoiceAiuiConfig` (`SKILL_ID` and `ADAPTER_ID` are both `fabot_voice_aiui`), a single `aiui` domain.

```python
with robot.skills.voice_aiui.edit_config() as conf:
    conf.aiui.auto_answer = False
# only the aiui domain is committed on exit
```

| Field | Default | Description |
|-------|---------|-------------|
| `api_keys` | empty credentials | `aiui_appid` / `aiui_api_key` / `aiui_api_sk`; with any missing the cloud features are unavailable while the skill keeps running and retries in the background |
| `auto_answer` | `True` | Whether to speak cloud answers directly; off publishes transcript and intent only |
| `play_intent_audio` | `False` | Whether to play bundled audio when an `intents` entry matches |
| `wakeup_interrupt` | `True` | Whether a wake word during playback or while awaiting the cloud interrupts the current turn |
| `scene` | `main` | AIUI scene id, matching the console |
| `auth_id` | `test-sn` | Auth user name |
| `tts.voice` | `x4_lingfeizhe_oral` | Default speaker; accepts `speakers[].name` or an official vcn |
| `tts.speed` | `50` | Speed 0–100, higher is faster |
| `speakers[]` | 8 Chinese / English voices | Each `name` / `vcn` / `locale` / `gender`; `list_speakers` / `set_speaker` / `speak` only accept these names and official vcns |
| `timeouts.result_ms` | `30000` | Timeout waiting for recognition and intent results |
| `timeouts.tts_start_ms` | `2000` | Timeout waiting for TTS to start sounding |
| `timeouts.tts_playback_ms` | `60000` | Overall cap for one playback |
| `hardware.slot` | `voice` | Logical slot of the `voice` capability |
| `resources.directory` | `""` | Resource root; empty uses the bundled resources in the install tree |
| `resources.work_directory` | `""` | Runtime scratch directory |
| `resources.aiui_library` | `""` | AIUI shared-library directory; empty uses the bundled copy |
| `intents[]` | `cola` / `aipaoge/tts_D2_cola.wav` | Each `name` / `audio`; played only when `play_intent_audio` is on |
| `logging.level` | `info` | `debug` / `info` / `warn` / `error` |

Credentials belong in the user runtime config only, never in the packaged template. Read legal enum values from `VoiceAiuiConfig.field_options()`.

## Related

- Skill concepts and availability checks: [Skills & Extensions](../../../usage/configuration/skills.md)
- Voice hardware and streams: [Voice](../voice.md)
- Config-domain access: [Configuration](../../../usage/configuration/configuration.md)
- Commands and Operations: [Commands & Operations](../../../usage/basics/commands-operations.md)
