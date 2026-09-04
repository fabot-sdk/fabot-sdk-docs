---
title: Camera
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Camera

## Module Overview

- Capability id: `camera`; slots: `robot.head_camera` / `robot.chest_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera`
- Camera access and image streams: single-shot capture, stream configuration, image-frame channels, and preview playback URLs. All four slots share the same API on independent cameras.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `capture` | — | `CaptureT` | Command |
| `capture_color` | — | `ColorCaptureT` | Command |
| `capture_depth` | — | `DepthCaptureT` | Command |
| `open` | `profiles`, `enable_sync` | `CameraSessionT` | Command |
| `close` | — | `CameraSessionT` | Command |

Command default `timeout_ms`: 10000 for `capture` / `capture_color` / `capture_depth`, 3000 for `open` / `close` (all overridable). All parameters are keyword-only. This module has no Operations.

| Channel | Content |
|---------|---------|
| `frameset()` | Frame-set stream (`CameraFrameSetT`: color / depth / infrared as one set) |
| `color()` | Color image stream (`ImageFrameT`) |
| `depth()` | Depth image stream (`ImageFrameT`) |
| `rtsp()` | RTSP preview playback URL (`StreamUrlT`, no frame iteration) |
| `webrtc()` | WebRTC preview playback URL (`StreamUrlT`, no frame iteration) |

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

Capture methods return whole image frames and are correspondingly heavy, hence the relaxed default timeout; for live preview, subscribe to a channel instead of polling captures.

### capture

Capture the current frame set (color + depth).

```python
capture(*, timeout_ms: int = 10000) -> CaptureT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`CaptureT`:

| Field | Type | Description |
|-------|------|-------------|
| `color` | `ImageFrameT` \| `None` | Color frame |
| `depth` | `ImageFrameT` \| `None` | Depth frame |
| `synchronized` | `bool` | Whether the two frames were captured in sync |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

`ImageFrameT` fields:

| Field | Type | Description |
|-------|------|-------------|
| `sequence` | `int` | Frame sequence |
| `width` / `height` | `int` | Image width / height (pixels) |
| `encoding` | `str` | Pixel encoding (e.g. `rgb8`) |
| `data` | `list[int]` | Pixel bytes |
| `frameId` | `str` | Reference frame id |
| `stampNs` | `int` | Capture timestamp (nanoseconds) |
| `isBigendian` | `int` | Whether the data is big-endian |
| `step` | `int` | Bytes per row |
| `cameraSlot` | `str` | Source slot |
| `stream` | `int` | Stream kind (`StreamKind`) |

```python
shot = robot.head_camera.capture()
if shot.outcome is not None and shot.outcome.success:
    print(shot.color.width, shot.color.height, shot.synchronized)
```

### capture_color

Capture only the color frame.

```python
capture_color(*, timeout_ms: int = 10000) -> ColorCaptureT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`ColorCaptureT`:

| Field | Type | Description |
|-------|------|-------------|
| `image` | `ImageFrameT` \| `None` | Color frame |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

### capture_depth

Capture only the depth frame.

```python
capture_depth(*, timeout_ms: int = 10000) -> DepthCaptureT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`DepthCaptureT`: `image` (`ImageFrameT`) / `outcome` (`OutcomeT`), same as `capture_color`.

### open

Open the camera session with the given stream profiles.

```python
open(*, profiles: list[StreamProfileT], enable_sync: bool, timeout_ms: int = 3000) -> CameraSessionT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `profiles` | `list[StreamProfileT]` | (required) | Stream profiles to enable |
| `enable_sync` | `bool` | (required) | Whether to enable cross-stream sync |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

`StreamProfileT` fields: `stream` (`StreamKind`: `COLOR` / `DEPTH` / `INFRARED`), `width` / `height` (pixels), `fps`, `encoding` (`str`), `alignedTo` (the stream this one aligns to).

**Returns**

`CameraSessionT`:

| Field | Type | Description |
|-------|------|-------------|
| `cameraSlot` | `str` | Camera slot |
| `state` | `int` | Device state (`DeviceState`: `IDLE` / `STREAMING`, etc.) |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

```python
from fabot.capabilities.camera import StreamKind, StreamProfileT

profile = StreamProfileT()
profile.stream = StreamKind.COLOR
profile.width, profile.height, profile.fps = 1280, 720, 30
profile.encoding = "rgb8"
session = robot.head_camera.open(profiles=[profile], enable_sync=True)
print(session.state, session.outcome.statusMessage)
```

### close

Close the camera session.

```python
close(*, timeout_ms: int = 3000) -> CameraSessionT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`CameraSessionT`: `cameraSlot` / `state` / `outcome`, same as `open`.

```python
session = robot.head_camera.close()
print(session.state, session.outcome.statusMessage)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage. Examples use `robot.head_camera`; the other camera slots behave the same.

### frameset()

Subscribe to the frame-set stream: each set carries the color / depth / infrared frames together.

```python
frameset(qos_profile: str = "latest") -> FramesetChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`FramesetChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `CameraFrameSetT` | Frame set |

`payload` (`CameraFrameSetT`) fields:

| Field | Type | Description |
|-------|------|-------------|
| `cameraSlot` | `str` | Source slot |
| `sequence` | `int` | Frame-set sequence |
| `stampNs` | `int` | Capture timestamp (nanoseconds) |
| `color` / `depth` / `infrared` | `ImageFrameT` \| `None` | Per-stream image frames |
| `synchronized` | `bool` | Whether the frames were captured in sync |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.head_camera.frameset(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    fs = frame.payload
    print(frame.sequence, fs.synchronized, fs.color.width if fs.color else None)
```

### color()

Subscribe to the color image stream.

```python
color(qos_profile: str = "latest") -> ColorChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`ColorChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `ImageFrameT` | Color image frame; fields under [capture](#capture) |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.chest_camera.color(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.sequence, frame.payload.width, frame.payload.height)
```

### depth()

Subscribe to the depth image stream. Open parameters and frame fields match `color()`; the frame type is `DepthChannelFrame` and `payload` is a depth `ImageFrameT`.

```python
depth(qos_profile: str = "latest") -> DepthChannel
```

```python
ch = robot.head_camera.depth(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.sequence, frame.payload.encoding)
```

### rtsp()

Get the RTSP preview playback URL. This is an info-only channel: there is no `frames()`; read the URL from the `info` property. Supports `renew()` / `close()` and the `with` context manager.

```python
rtsp(qos_profile: str = "latest") -> RtspChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**info** (`StreamUrlT`)

| Field | Type | Description |
|-------|------|-------------|
| `cameraSlot` | `str` | Camera slot |
| `url` | `str` | Playback URL |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

```python
with robot.head_camera.rtsp() as ch:
    print(ch.info.url)
```

### webrtc()

Get the WebRTC preview playback URL. Like `rtsp()`, this is an info-only channel: `info` is a `StreamUrlT`, with `renew()` / `close()` and `with` support.

```python
webrtc(qos_profile: str = "latest") -> WebrtcChannel
```

```python
with robot.head_camera.webrtc() as ch:
    print(ch.info.url)
```

## Events

Subscribe via each slot's `events` (e.g. `robot.head_camera.events`; the other cameras likewise). Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.head_camera.events.fault_changed.subscribe(callback)` (same on the other slots).

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.head_camera.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.head_camera.events.lifecycle_changed.subscribe(callback)` (same on the other slots).

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

token = robot.chest_camera.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with each slot's `faults()` (e.g. `robot.head_camera.faults()`), which returns `Faults`.

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

This module has no `status()`. For aggregated robot status see `robot.status()`. Device state comes from `CameraSessionT.state` (`DeviceState`) returned by `open()` / `close()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

On a given camera slot, `open` and `close` share the `camera_control` resource; new requests queue. Captures and channel subscriptions do not take this resource.
