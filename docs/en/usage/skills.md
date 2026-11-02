---
title: Skills & Extensions
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Skills & Extensions

Besides the 15 capability modules, the SDK exposes **skills**: units that combine several capability slots into a higher-level semantic feature. Skills are reached through `robot.skills` and look like a capability proxy (`slot_id` / `handle` / `events` / `health()` / `lifecycle()` / `faults()` / `ping()` plus config access), but they operate a skill unit on the robot rather than a single capability slot.

| Skill | Entry | Purpose |
|-------|-------|---------|
| Multi-camera sync | `robot.skills.camera_sync` | Pair frames from several camera slots into a `SyncedFrameSet` |
| Voice semantics | `robot.skills.voice_aiui` | Transcripts, intents and synthesized speech on top of the `voice` hardware capability |

## Checking availability

Whether a skill is deployed and enabled comes from the robot configuration. Check `is_available` (a read-only property) before calling anything else:

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    if robot.skills.camera_sync.is_available:
        groups = robot.skills.camera_sync.get_sync_groups()
        print([group.id for group in groups.groups])
```

`is_available` is `True` when the skill slot is enabled with an adapter bound; if no configuration is readable it falls back to checking whether the handle is valid.

## Multi-camera sync (camera_sync)

Pairs the same logical stream from several camera slots by timestamp, producing "one instant across all cameras".

```python
robot.skills.camera_sync.get_sync_groups(*, timeout_ms: int = 1000) -> SyncGroupList
robot.skills.camera_sync.capture_synced(*, group_id: str = "", wait_for_fresh: bool = True, timeout_ms: int = 5000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> SyncedFrameSet
robot.skills.camera_sync.sync_groups(qos_profile: str = "latest") -> SyncGroupsChannel
robot.skills.camera_sync.synced_frames(qos_profile: str = "latest") -> SyncedFramesChannel
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `group_id` | `str` | `""` | Sync group id; empty uses the configured default group |
| `wait_for_fresh` | `bool` | `True` | Whether to wait for a fresh set |
| `timeout_ms` | `int` | `5000` | Capture timeout in milliseconds |
| `transport_hint` | `FrameTransportHint` | `AUTO` | Frame transport preference |
| `client_boot_id` | `str` | `""` | Client boot id; empty fills it automatically |

**`SyncGroupList` fields**: `groups` (`list[SyncGroup]`) / `clock_domain` / `clock_epoch_id` / `ptp_locked` / `active_group_count` / `region_overrun_total`.

**`SyncGroup` fields**: `id` / `inputs` (`slot` / `stream` / `fps` / `encoding` / `max_width` / `max_height`) / `tolerance_ms` / `max_wait_ms` / `queue_depth` / `missing_policy` (`MissingPolicy`) / `emitted_sets` / `dropped_sets`.

**`SyncedFrameSet` fields**: `group_id` / `sequence` / `target_stamp_ns` / `clock_domain` / `clock_epoch_id` / `ptp_locked` / `tolerance_ns` / `max_uncertainty_ns` / `expires_at_ns`, plus the member list.

**`SyncedMember` fields**: `slot` / `stream` / `match_status` (`MemberMatchStatus`) / `delta_ns` / `timestamp_uncertainty_ns` / `frame` (`ImageFrame`).

| `MissingPolicy` | Meaning |
|-----------------|---------|
| `DROP_SET` | Drop the whole set when a member is missing |
| `EMIT_PARTIAL` | Emit the set with the missing member empty |
| `REUSE_LATEST` | Fill the gap with the most recent older frame |

| `MemberMatchStatus` | Meaning |
|---------------------|---------|
| `MATCHED` | A fresh frame landed inside the window |
| `REUSED` | An older frame was reused |
| `MISSING` | No frame |

```python
from fabot.capabilities.camera import FrameTransportHint

sync = robot.skills.camera_sync
frame_set = sync.capture_synced(group_id="wrist_pair", transport_hint=FrameTransportHint.AUTO)
print(frame_set.sequence, frame_set.ptp_locked, frame_set.max_uncertainty_ns)
for member in frame_set.members:
    print(member.slot, member.stream, member.match_status, member.delta_ns)
```

`synced_frames()` is the continuous stream (`SyncedFramesChannel`); `sync_groups()` announces group-list changes (`SyncGroupsChannel`, which exposes only `info()` and lease operations).

The skill config domains (groups, tolerances, missing policy, frame-region retention) are read and written with `get_config()` / `set_config()` / `edit_config()`, following the same rules as capability config, see [Configuration](configuration.md).

## Voice semantics (voice_aiui)

Adds transcripts, intent recognition and synthesized speech on top of the `voice` hardware capability. Capture and playback of raw audio stay in [Voice](../reference/python/voice.md); this skill handles the semantics.

```python
robot.skills.voice_aiui.speak(text: str, *, speaker_id: str = "") -> SpeakOperation
robot.skills.voice_aiui.stop(*, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.list_speakers(*, timeout_ms: int = 3000) -> SpeakerList
robot.skills.voice_aiui.set_speaker(speaker_id: str, *, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.set_speaking_rate(speaking_rate: float, *, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.set_auto_answer(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.set_play_intent_audio(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.get_settings(*, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.get_status(*, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.transcript(qos_profile: str = "latest") -> TranscriptChannel
robot.skills.voice_aiui.intent(qos_profile: str = "latest") -> IntentChannel
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `str` | (required) | Text to speak |
| `speaker_id` | `str` | `""` | Speaker id; empty keeps the current speaker |
| `speaking_rate` | `float` | (required) | Speech rate multiplier |
| `enabled` | `bool` | (required) | Auto-answer / intent-audio toggle |

| Member | Description |
|--------|-------------|
| `speak(...)` | Synthesize and play, returning a pollable, cancelable `SpeakOperation` |
| `transcript()` | Transcript stream with `TranscriptEvent` payloads |
| `intent()` | Intent stream with `IntentEvent` payloads |
| `stop()` | Interrupt the current playback |
| `list_speakers()` / `set_speaker()` | List and select speakers |
| `set_speaking_rate()` | Speech rate |
| `set_auto_answer()` / `set_play_intent_audio()` / `get_settings()` | Auto-answer, intent audio and settings |
| `get_status()` | Skill status snapshot |

```python
aiui = robot.skills.voice_aiui
if aiui.is_available:
    for event in aiui.intent().frames(poll_timeout_ms=200, timeout_ms=10000):
        print(event.payload.intent_id, event.payload.transcript)
        break
    aiui.speak("Okay, heading to the charging dock.").wait(timeout=10.0)
```

:::note Boundary with the hardware capability
`robot.voice` manages the microphone and speaker themselves (volume, mute, wake word, raw audio streams); `robot.skills.voice_aiui` manages the semantics (transcripts, intents, synthesis). Both can be used together.
:::

## Adding a custom skill

A skill is an independent unit on the robot, configured through config domains exactly like a capability adapter. Recognizing a skill on the application side needs deployment and configuration on the robot. The SDK only exposes the generated skill entries (`camera_sync` and `voice_aiui` today). See [Configuration](configuration.md) for the config-domain mechanics.

## Related

- Reading and writing capability config domains: [Configuration](configuration.md)
- Managing platform services (process level): [Platform Services](services.md)
- Camera hardware and streams: [Camera](../reference/python/camera.md)
- Voice hardware and streams: [Voice](../reference/python/voice.md)
