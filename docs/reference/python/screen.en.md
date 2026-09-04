---
title: Screen
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Screen

## Module Overview

- Capability id: `screen`; slot: `robot.screen`
- Control the robot face screen: overlay text, images, video, and the bottom battery bar, plus query the current screen snapshot. Background content (idle / image / video) is independent of the overlay text.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `show_text` | `text` | `ScreenStatusAppliedT` | Command |
| `show_image` | `uri` | `ScreenStatusAppliedT` | Command |
| `play_video` | `uri`, `loop` | `ScreenStatusAppliedT` | Command |
| `stop` | — | `ScreenStatusAppliedT` | Command |
| `get_status` | — | `ScreenStatusAppliedT` | Command |
| `set_battery` | `percent` | `ScreenStatusAppliedT` | Command |

Command default `timeout_ms`: 3000 for `show_image` / `play_video`, 1000 for the rest (all overridable). All parameters are keyword-only.

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### show_text

Set the overlay text. An empty string turns the overlay off; it does not interrupt image or video background content.

```python
show_text(*, text: str, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `str` | (required) | Overlay text; an empty string turns the overlay off |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT` (shared by all write commands and `get_status`):

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `status` | `ScreenStatusT` \| `None` | Screen snapshot after the change; fields below |

`status` (`ScreenStatusT`):

| Field | Type | Description |
|-------|------|-------------|
| `content` | `int` | Current background content, a `ScreenContent` value: `UNKNOWN` (0) / `IDLE` (1) / `IMAGE` (2) / `VIDEO` (3) |
| `uri` | `str` \| `None` | URI of the current image / video; empty when idle |
| `overlayText` | `str` \| `None` | Current overlay text; empty when there is no overlay |
| `playing` | `bool` | Whether a video is playing |
| `batteryPercent` | `int` | Bottom battery bar: 0–100 shows it; negative hides it |

```python
applied = robot.screen.show_text(text="Task in progress")
print(applied.outcome.success, applied.status.overlayText)
```

### show_image

Display an image and keep it; the overlay text is not cleared by default.

```python
show_image(*, uri: str, timeout_ms: int = 3000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `uri` | `str` | (required) | Image URI; supports `file://` and other resolvable URIs |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT`: `outcome` / `status`; see [show_text](#show_text) for the fields.

```python
applied = robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
print(applied.outcome.success, applied.status.content)
```

### play_video

Play a video; the command returns immediately. With `loop=True` the video loops until replaced or `stop()`; with `loop=False` the end-of-media behavior is not guaranteed (the screen may freeze on the last frame or go black), and the command still returns immediately.

```python
play_video(*, uri: str, loop: bool, timeout_ms: int = 3000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `uri` | `str` | (required) | Video URI; supports `file://` and other resolvable URIs |
| `loop` | `bool` | (required) | `True` loops the video; `False` plays it once |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT`: `outcome` / `status`; see [show_text](#show_text) for the fields.

```python
applied = robot.screen.play_video(
    uri="file:///usr/share/fabot/media/intro.mp4", loop=True,
)
print(applied.outcome.success, applied.status.playing)
```

### stop

Stop the current playback.

```python
stop(*, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT`: `outcome` / `status`; see [show_text](#show_text) for the fields.

```python
applied = robot.screen.stop()
print(applied.outcome.success)
```

### get_status

Read the current screen snapshot.

```python
get_status(*, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT`: `outcome` / `status`; see [show_text](#show_text) for the fields.

```python
applied = robot.screen.get_status()
st = applied.status
print(st.content, st.uri, st.overlayText, st.playing, st.batteryPercent)
```

### set_battery

Set the bottom battery bar, independent of text / image / video content. A `percent` of 0–100 shows the bar; a negative value hides it.

```python
set_battery(*, percent: int, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `percent` | `int` | (required) | Battery percentage 0–100; a negative value hides the bar |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`ScreenStatusAppliedT`: `outcome` / `status`; see [show_text](#show_text) for the fields.

```python
applied = robot.screen.set_battery(percent=80)
print(applied.outcome.success, applied.status.batteryPercent)
```

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md) for shared channel usage.

## Events

Subscribe via `robot.screen.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.screen.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.screen.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.screen.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.screen.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.screen.faults()`, which returns `Faults`.

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
| `activity` | `Activity` | Current activity: `Activity.Idle` / `Activity.Image` / `Activity.Video`, matching the snapshot's `content` |

```python
st = robot.screen.status()
print(st.activity)   # Activity.Idle / Activity.Image / Activity.Video
```

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

The face screen's display resource serves one write at a time: `show_text` / `show_image` / `play_video` / `stop` / `set_battery` share the same display resource and new commands queue; `get_status` is a read-only query and does not join the queue.
