---
title: Multi-camera Sync CameraSync
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Multi-camera Sync CameraSync

## Module Overview

- Skill: `camera_sync`; entry: `robot.skills.camera_sync`
- Skill id: `fabot_camera_sync`; config type `CameraSyncConfig`
- Pairs the same logical stream from several camera slots by timestamp, producing "one instant across all cameras" as a `SyncedFrameSet`.
- Check groups with `get_sync_groups()`, then grab one set with `capture_synced()` or subscribe to `synced_frames()` for a continuous stream.
- The skill has no Operations: `capture_synced` is a short Command and occupies no resources.

Common members (`is_available` / `handle` / `events` / `health()` / `faults()` / `ping()` / `self_check()` and config access) are in the [Skills Overview](index.md).

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `get_sync_groups` | Command | Read the sync-group list (`SyncGroupList`); default timeout 1000 ms. |
| `capture_synced` | Command | Capture one synchronized multi-camera set (`SyncedFrameSet`); default timeout 5000 ms. |
| `sync_groups` | Channel | Sync-group list changes; carries only the `info` property and emits no frames. |
| `synced_frames` | Channel | Synchronized frame-set stream; frames are `SyncedFrameSet`. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return synchronously and `timeout_ms` can be overridden per call.

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`group_id`); the generated types also accept the camelCase alias.

### get_sync_groups

Read the effective sync-group list.

```python
get_sync_groups(*, timeout_ms: int = 1000) -> SyncGroupList
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Call timeout in milliseconds |

**Returns** `SyncGroupList`

| Field | Type | Description |
|-------|------|-------------|
| `groups` | `list[SyncGroup]` | Sync groups |
| `clock_domain` | `str` | Clock domain used for pairing |
| `clock_epoch_id` | `str` | Clock epoch id; a change means the clock re-synced |
| `ptp_locked` | `bool` | Whether PTP is locked |
| `active_group_count` | `int` | Number of active sync groups |
| `region_overrun_total` | `int` | Cumulative frame-region retention overruns |

**`SyncGroup` fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Sync group id |
| `inputs` | `list[SyncGroupInput]` | Group inputs (`slot` / `stream` / `fps`) |
| `tolerance_ms` | `int` | Largest allowed time spread within a set |
| `max_wait_ms` | `int` | Longest wait to complete a set |
| `queue_depth` | `int` | Buffer depth per input |
| `missing_policy` | `MissingPolicy` | Behaviour when a member is missing |
| `emitted_sets` | `int` | Sets emitted so far |
| `dropped_sets` | `int` | Sets dropped so far |

```python
groups = robot.skills.camera_sync.get_sync_groups()
for group in groups.groups:
    print(group.id, group.tolerance_ms, group.missing_policy, group.emitted_sets, group.dropped_sets)
```

### capture_synced

Capture one synchronized multi-camera set. Frames normally travel over shared memory; when the host cannot use SHM or the read fails, the client retries once inline.

```python
capture_synced(*, group_id: str = "", wait_for_fresh: bool = True, timeout_ms: int = 5000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> SyncedFrameSet
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `group_id` | `str` | `""` | Sync group id; empty uses the configured default group |
| `wait_for_fresh` | `bool` | `True` | Whether to wait for a fresh set; `False` may return the most recent one |
| `timeout_ms` | `int` | `5000` | Capture timeout in milliseconds |
| `transport_hint` | `FrameTransportHint` | `AUTO` | Frame transport preference: `AUTO` / `SHM_ONLY` / `INLINE_REQUIRED` |
| `client_boot_id` | `str` | `""` | Client boot id; empty is filled with this host's id |

**Returns** `SyncedFrameSet`

| Field | Type | Description |
|-------|------|-------------|
| `group_id` | `str` | Matched sync group id |
| `sequence` | `int` | Frame-set sequence |
| `target_stamp_ns` | `int` | Target instant this set aligns to, in nanoseconds |
| `clock_domain` / `clock_epoch_id` | `str` | Clock domain and epoch of the timestamps |
| `ptp_locked` | `bool` | Whether this set was aligned under PTP |
| `tolerance_ns` | `int` | Effective time tolerance in nanoseconds |
| `max_uncertainty_ns` | `int` | Largest member timestamp uncertainty in nanoseconds |
| `expires_at_ns` | `int` | Expiry instant of the set in nanoseconds |
| `complete` | `bool` | Whether every member matched a frame |
| `sync_status` | `TemporalSyncStatus` | Temporal sync status |
| `members` | `list[SyncedMember]` | Member frames |
| `frames` | `list[ImageFrame]` | Flattened list of member frames |

**`SyncedMember` fields**

| Field | Type | Description |
|-------|------|-------------|
| `slot` | `str` | Camera slot |
| `stream` | `StreamKind` | Stream kind |
| `match_status` | `MemberMatchStatus` | Match result |
| `delta_ns` | `int` | Offset from the target instant in nanoseconds |
| `timestamp_uncertainty_ns` | `int` | Timestamp uncertainty of this member in nanoseconds |
| `frame` | `ImageFrame \| None` | Frame data; `None` when missing |

`ImageFrame` fields are documented under the `color` channel in [Camera](../camera.md).

```python
from fabot.capabilities.camera import FrameTransportHint

frame_set = robot.skills.camera_sync.capture_synced(group_id="front_cameras", transport_hint=FrameTransportHint.AUTO)
print(frame_set.sequence, frame_set.complete, frame_set.sync_status, frame_set.max_uncertainty_ns)
for member in frame_set.members:
    print(member.slot, member.match_status, member.delta_ns, member.frame is not None)
```

**Enums**

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

| `TemporalSyncStatus` | Meaning |
|-----------------------|---------|
| `HARDWARE_SYNCED` | Aligned under hardware sync (PTP or trigger line) |
| `SOFTWARE_MATCHED` | Matched in software by timestamp |
| `PARTIAL` | Only some members matched |
| `TIMEOUT` | Timed out assembling the set |
| `INVALID_CLOCK` | Clock domain or epoch mismatch |

These enums and `StreamKind` all carry `UNKNOWN` for "not reported".

## Channels

Opening a channel establishes a lease and returns a handle; iterate with `frames()`, take one frame with `next()`, extend with `renew()`, release with `close()`. General usage is in [Events & Data Channels](../../../usage/events-channels.md).

### synced_frames

Synchronized frame-set stream.

```python
synced_frames(qos_profile: str = "latest") -> SyncedFramesChannel
```

The frame payload is `SyncedFrameSet` (fields as in `capture_synced`); the outer wrapper `SyncedFramesChannelFrame` carries `channel_id` / `sequence` / `timestamp_us` / `payload`.

With `frames(poll_timeout_ms=1000, timeout_ms=None)`, a `timeout_ms` of `None` means only the poll interval applies and there is no overall deadline; `next()` with no arguments waits 5 seconds.

```python
ch = robot.skills.camera_sync.synced_frames(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.complete, frame.payload.target_stamp_ns)
finally:
    ch.close()
```

### sync_groups

Sync-group list changes. It only exposes the `info` property and lease operations (`id` / `descriptor` / `renew()` / `close()`) and emits no frames.

```python
sync_groups(qos_profile: str = "latest") -> SyncGroupsChannel
```

`info` returns a `SyncGroupList`; it raises `RuntimeError` when the channel carries no info representation. Use `synced_frames()` when you need per-frame content.

## Events

Subscribe through `robot.skills.camera_sync.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader`.

| Entry | Event type | Payload |
|-------|-----------|---------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`: `Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`: `CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | Wildcard subscription | `Event` |

```python
def on_fault(event):
    print(event.header.timestamp_us, event.faults.revision, len(event.faults.records))

token = robot.skills.camera_sync.events.fault_changed.subscribe(on_fault)
# ...
token.close()
```

## Exceptions

`robot.skills.camera_sync.faults()` returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

For human-readable text use `Catalogs.format_fault(record)`, see [Catalogs](../catalogs.md).

Two typical capture failures: `capture_synced` raises `Timeout` when it cannot assemble a set in time; when frames fail to leave shared memory and the inline retry also fails, it raises a frame transport error (the `FrameError` family) — setting `transport_hint` to `INLINE_REQUIRED` explicitly bypasses shared memory. See [Error Handling](../../../usage/errors.md).

## Status

`status()` returns a read-only status bag; the robot-wide aggregation has no skill fields. It raises `RuntimeError` when nothing has been reported.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `clock_domain` | `str` | `host_monotonic` | Clock domain used for pairing |
| `clock_epoch_id` | `str` | `host_monotonic` | Clock epoch id |
| `ptp_locked` | `bool` | `False` | Whether PTP is locked |
| `active_group_count` | `int` | `0` | Active sync groups |
| `region_overrun_total` | `int` | `0` | Cumulative frame-region retention overruns |

Common read-only queries: `health()` returns `SlotHealth` and `lifecycle()` returns `CapabilityLifecycleSnapshot`.

## Resources

The skill has no Operations and occupies no resources: `capture_synced` is a short Command and frames travel back over shared memory or inline; `synced_frames` / `sync_groups` are channel subscriptions managed by leases.

## Config domains

`CameraSyncConfig` (`SKILL_ID` and `ADAPTER_ID` are both `fabot_camera_sync`), two domains: `alignment` / `frame_region`.

```python
with robot.skills.camera_sync.edit_config() as conf:
    conf.alignment.groups[0].tolerance_ms = 8
# only the alignment domain is committed on exit
```

**`alignment`**

| Field | Default | Description |
|-------|---------|-------------|
| `groups` | one group, `front_cameras` | Sync group list |

**`alignment.groups[]`**

| Field | Default | Description |
|-------|---------|-------------|
| `id` | `front_cameras` | Group id; feeds output topic and status naming, must be unique |
| `inputs` | four colour streams (`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`) | Group input streams |
| `tolerance_ms` | `16` | Largest allowed spread; `0` or omitted derives `1/min(fps)` |
| `max_wait_ms` | `33` | Longest wait to complete a set; on timeout `missing_policy` applies |
| `queue_depth` | `8` | Buffered frames per input |
| `missing_policy` | `drop_set` | `drop_set` / `emit_partial` / `reuse_latest` |
| `reuse_max_age_ms` | `1000` | Max age of a reusable frame under `reuse_latest` |
| `clock` | `host_receive` / `33.334` | `fallback` / `max_uncertainty_ms` |

**`alignment.groups[].inputs[]`**

| Field | Default | Description |
|-------|---------|-------------|
| `slot` | `head_camera` | Camera slot name |
| `stream` | `color` | `color` / `depth` / `registered_depth` / `infrared` / `infrared_left` / `infrared_right` |
| `fps` | `30` | Expected frame rate in hertz; inputs in a group should agree |
| `encoding` | `rgb8` | Pixel format, decides the lane budget; empty infers from `stream` |
| `max_width` / `max_height` | `1280` / `720` | Max dimensions in pixels, used to preallocate lane buffers |

**`frame_region`**

| Field | Default | Description |
|-------|---------|-------------|
| `retention_ms` | `1000` | Reader window in milliseconds; reads past it return `shared_region_expired` |
| `max_region_bytes` | `536870912` | Whole-region byte cap; must fit slots × members per group × per-lane budget |

Read legal enum values from `CameraSyncConfig.field_options()` rather than hard-coding them.

## Related

- Skill concepts and availability checks: [Skills & Extensions](../../../usage/skills.md)
- Camera hardware and streams: [Camera](../camera.md)
- Config-domain access: [Configuration](../../../usage/configuration.md)
- Commands and timeouts: [Commands & Operations](../../../usage/commands-operations.md)
