---
title: Screen
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Screen

## Module Overview

- Capability id: `screen`; slots: `robot.screen`
- Domain: `screen`; capability version: `1.1.0`
- Screen content control: text overlay, image, video and stop, plus the battery percentage shown.
- `status()` reports the current content kind (`Activity`: `idle` / `image` / `video`).

Every write command except `get_status` shares the `display` resource with policy `queue`.

## API Overview

| Name | Kind | Description |
|------|------|------|
| `show_text` | Command | Overlay text on the screen; default timeout 1000 ms. |
| `show_image` | Command | Show an image on the screen; default timeout 3000 ms. |
| `play_video` | Command | Play a video; `loop=True` repeats it; default timeout 3000 ms. |
| `stop` | Command | Stop the current content; default timeout 1000 ms. |
| `get_status` | Command | Read the screen status snapshot; `get_state` is an alias; default timeout 1000 ms. |
| `set_battery` | Command | Sync the battery percentage shown on screen; default timeout 1000 ms. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### show_text

Overlay text on the screen.

```python
show_text(text: str, *, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `text` | `str` | (required) | Text to display |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

```python
applied = robot.screen.show_text("Hello, fabot!")
print(applied.status.overlay_text, applied.status.content)
```

### show_image

Show an image on the screen.

```python
show_image(uri: str, *, timeout_ms: int = 3000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `uri` | `str` | (required) | Resource URI |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

### play_video

Play a video; `loop=True` repeats it.

```python
play_video(uri: str, *, loop: bool = True, timeout_ms: int = 3000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `uri` | `str` | (required) | Resource URI |
| `loop` | `bool` | `True` | Whether to loop |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

### stop

Stop the current content.

```python
stop(*, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

### get_status

Read the screen status snapshot; `get_state` is an alias.

```python
get_status(*, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

### set_battery

Sync the battery percentage shown on screen.

```python
set_battery(percent: int, *, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `percent` | `int` | (required) | Battery percentage, 0–100 |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ScreenStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `ScreenStatus` | Status snapshot |

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md).

## Events

Subscribe through `robot.<slot>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

| Entry | Event type | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`: `Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot` |

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
| `activity` | `str` | `idle` | `idle` / `image` / `video` |

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

`show_text` / `show_image` / `play_video` / `stop` / `set_battery` share the `display` resource with policy `queue`; `get_status` holds no resource.
