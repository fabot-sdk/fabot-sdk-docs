---
title: Camera
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Camera

## Module Overview

- Capability id: `camera`; slots: `robot.head_camera` / `robot.chest_camera` / `robot.waist_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera`
- Domain: `perception`; capability version: `1.1.0`
- The camera capability covers color, depth, registered depth, infrared, confidence, point cloud and IMU streams, plus calibration, imaging control and software trigger.
- Spatial registration uses `registration_mode` (the `registered_*` streams); temporal pairing uses `enable_stream_sync` (`FrameSet.sync_status`). They are different axes.

Cameras start streaming automatically once the capability is active, so `open()` is only needed to change profiles or reopen a session.
`camera.depth` always stays in the raw depth optical frame; depth registered to color only appears on `registered_depth()` and `FrameSet.registered_depth`.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_info` | `Empty` | `DeviceInfo` | 1000 ms |
| `get_state` | `Empty` | `SessionState` | 1000 ms |
| `open` | `SessionConfig` | `SessionState` | 5000 ms |
| `close` | `Empty` | `SessionState` | 3000 ms |
| `capture` | `CaptureOptions` | `FrameSet` | 10000 ms |
| `trigger` | `TriggerPulse` | `TriggerAck` | 2000 ms |
| `get_calibration` | `Empty` | `CameraCalibration` | 1000 ms |
| `get_imaging` | `Empty` | `ImagingState` | 1000 ms |
| `set_imaging` | `ImagingPatch` | `ImagingState` | 2000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Channel | Content |
|------|------|
| `frameset()` | `FrameSet` |
| `color()` | `ImageFrame` |
| `depth()` | `ImageFrame` |
| `registered_depth()` | `ImageFrame` |
| `infrared()` | `ImageFrame` |
| `infrared_left()` | `ImageFrame` |
| `infrared_right()` | `ImageFrame` |
| `confidence()` | `ImageFrame` |
| `points()` | `PointCloud` |
| `imu()` | `ImuSample` |
| `rtsp()` | `MediaEndpoint` (media endpoint, not frame iteration) |
| `webrtc()` | `MediaEndpoint` (media endpoint, not frame iteration) |

Enums used on this page:

**`StreamKind` enum**

| Value | Description |
|-------|-------------|
| `COLOR` | Color |
| `DEPTH` | Raw depth |
| `REGISTERED_DEPTH` | Depth registered to color |
| `INFRARED` | Infrared |
| `INFRARED_LEFT` | Left infrared |
| `INFRARED_RIGHT` | Right infrared |
| `CONFIDENCE` | Confidence |
| `THERMAL` | Thermal |

**`RegistrationMode` enum**

| Value | Description |
|-------|-------------|
| `NONE` | No registration |
| `HARDWARE` | Hardware registration |
| `SOFTWARE` | Software registration |

**`FrameTransportHint` enum**

| Value | Description |
|-------|-------------|
| `AUTO` | Choose automatically |
| `SHM_ONLY` | Shared memory only |
| `INLINE_REQUIRED` | Inline transport required |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_info

Read device information: vendor, model, serial number, connection type and supported features.

```python
get_info(*, timeout_ms: int = 1000) -> DeviceInfo
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `DeviceInfo`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `vendor` | `str` | Vendor |
| `model` | `str` | Model |
| `serial_number` | `str` | Serial number |
| `firmware_version` | `str` | Firmware version |
| `connection_type` | `ConnectionType` | Physical connection type (`ConnectionType`) |
| `supported_streams` | `list[StreamKind]` | Supported stream kinds |
| `supported_profiles` | `list[StreamProfile]` | Supported stream profiles |
| `supports_hardware_registration` | `bool` | Whether hardware registration is supported |
| `supports_software_registration` | `bool` | Whether software registration is supported |
| `supports_hardware_sync` | `bool` | Whether hardware sync is supported |
| `supports_software_trigger` | `bool` | Whether software trigger is supported |
| `has_imu` | `bool` | Whether an IMU is present |
| `has_emitter` | `bool` | Whether an emitter is present |

### get_state

Read the current session state (streaming, sync, registration, calibration generation and temperature).

```python
get_state(*, timeout_ms: int = 1000) -> SessionState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `SessionState`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `state` | `DeviceState` | State value |
| `sync_mode` | `HardwareSyncMode` | Hardware sync role (`SyncMode`) |
| `registration_mode` | `RegistrationMode` | Pixel registration mode (`RegistrationMode`) |
| `enable_stream_sync` | `bool` | Whether to enable multi-stream time pairing |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `active_streams` | `list[ActiveStreamStatus]` | Active streams with measured frame rates |
| `awaiting_external_trigger` | `bool` | Whether an external trigger is awaited |
| `temperature_c` | `float` | Temperature in Celsius |
| `status_message` | `str` | Status text |

### open

Open the session. Empty `profiles` keeps device defaults; `registration_mode` selects pixel registration; `enable_stream_sync` turns on multi-stream time pairing.

```python
open(*, profiles: list[StreamProfile] | None = None, enable_stream_sync: bool = True, registration_mode: RegistrationMode = RegistrationMode.NONE, enable_imu: bool = False, timeout_ms: int = 5000) -> SessionState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `profiles` | `list[StreamProfile] | None` | `None` | Profiles to open; `None` keeps the device defaults |
| `enable_stream_sync` | `bool` | `True` | Whether to enable multi-stream time pairing |
| `registration_mode` | `RegistrationMode` | `RegistrationMode.NONE` | Pixel registration mode |
| `enable_imu` | `bool` | `False` | Whether to enable the IMU |
| `timeout_ms` | `int` | `5000` | Timeout in milliseconds |

**Returns** `SessionState`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `state` | `DeviceState` | State value |
| `sync_mode` | `HardwareSyncMode` | Hardware sync role (`SyncMode`) |
| `registration_mode` | `RegistrationMode` | Pixel registration mode (`RegistrationMode`) |
| `enable_stream_sync` | `bool` | Whether to enable multi-stream time pairing |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `active_streams` | `list[ActiveStreamStatus]` | Active streams with measured frame rates |
| `awaiting_external_trigger` | `bool` | Whether an external trigger is awaited |
| `temperature_c` | `float` | Temperature in Celsius |
| `status_message` | `str` | Status text |

### close

Close the camera session and stop every stream.

```python
close(*, timeout_ms: int = 3000) -> SessionState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `SessionState`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `state` | `DeviceState` | State value |
| `sync_mode` | `HardwareSyncMode` | Hardware sync role (`SyncMode`) |
| `registration_mode` | `RegistrationMode` | Pixel registration mode (`RegistrationMode`) |
| `enable_stream_sync` | `bool` | Whether to enable multi-stream time pairing |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `active_streams` | `list[ActiveStreamStatus]` | Active streams with measured frame rates |
| `awaiting_external_trigger` | `bool` | Whether an external trigger is awaited |
| `temperature_c` | `float` | Temperature in Celsius |
| `status_message` | `str` | Status text |

### capture

Capture one multi-stream frame set. Large frames prefer shared memory and fall back to inline transport; `wait_for_fresh=True` waits for a new frame while `max_age_ms` bounds the accepted cache age.

```python
capture(*, streams: list[StreamKind] | None = None, wait_for_fresh: bool = True, max_age_ms: int = 500, timeout_ms: int = 8000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> FrameSet
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `streams` | `list[StreamKind] | None` | `None` | Streams to capture; `None` means every available stream |
| `wait_for_fresh` | `bool` | `True` | Whether to wait for a fresh frame |
| `max_age_ms` | `int` | `500` | Maximum frame age in milliseconds |
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |
| `transport_hint` | `FrameTransportHint` | `FrameTransportHint.AUTO` | Frame transport preference |
| `client_boot_id` | `str` | `""` | Client boot id; empty fills it automatically |

**Returns** `FrameSet`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `sequence` | `int` | Sequence number increasing from 0 |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `sync_status` | `SyncStatus` | Multi-stream time pairing status (`SyncStatus`) |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `color` | `ImageFrame` | Color |
| `depth` | `ImageFrame` | Depth data |
| `registered_depth` | `ImageFrame` | Depth registered to color |
| `infrared` | `ImageFrame` | Infrared stream |
| `infrared_left` | `ImageFrame` | Left infrared stream |
| `infrared_right` | `ImageFrame` | Right infrared stream |
| `confidence` | `ImageFrame` | Confidence data |

```python
frame_set = robot.head_camera.capture()
print(frame_set.sequence, frame_set.sync_status)
if frame_set.color is not None:
    print(frame_set.color.width, frame_set.color.height, frame_set.color.frame_id)
```

### trigger

Emit an external trigger pulse for the `SOFTWARE_TRIGGER` sync role.

```python
trigger(*, frame_count: int = 1, timeout_ms: int = 2000) -> TriggerAck
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `frame_count` | `int` | `1` | Number of frames to trigger |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `TriggerAck`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `trigger_sequence` | `int` | Trigger sequence number |
| `accepted_at_ns` | `int` | Acceptance time in ns |

### get_calibration

Read calibration data: per-stream intrinsics, depth-to-color / left-right infrared / IMU-to-color extrinsics, stereo baseline, depth scale and the valid depth range. A change in `generation` means the calibration was updated.

```python
get_calibration(*, timeout_ms: int = 1000) -> CameraCalibration
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `CameraCalibration`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `generation` | `int` | Status generation |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `min_depth_m` | `float` | Minimum valid depth in meters |
| `max_depth_m` | `float` | Maximum valid depth in meters |
| `color` | `OpticalIntrinsics` | Color |
| `depth` | `OpticalIntrinsics` | Depth data |
| `registered_depth` | `OpticalIntrinsics` | Depth registered to color |
| `infrared` | `OpticalIntrinsics` | Infrared stream |
| `infrared_left` | `OpticalIntrinsics` | Left infrared stream |
| `infrared_right` | `OpticalIntrinsics` | Right infrared stream |
| `depth_to_color` | `Transform3d` | Extrinsics from depth to color |
| `infrared_left_to_right` | `Transform3d` | Extrinsics from left to right infrared |
| `imu_to_color` | `Transform3d` | Extrinsics from IMU to color |
| `stereo_baseline` | `StereoBaseline` | Stereo baseline and reference plane distance |

```python
calib = robot.head_camera.get_calibration()
print(calib.generation, calib.depth_scale)
print(calib.color.fx, calib.color.fy, calib.color.cx, calib.color.cy)
print(calib.depth_to_color.tx, calib.depth_to_color.qw)
```

### get_imaging

Read imaging controls (exposure, gain, white balance, mains frequency, emitter).

```python
get_imaging(*, timeout_ms: int = 1000) -> ImagingState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ImagingState`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `color` | `ColorImagingControl` | Color |
| `depth` | `DepthImagingControl` | Depth data |
| `ae_strategy` | `AutoExposureStrategy` | Auto-exposure strategy (`AutoExposureStrategy`) |

### set_imaging

Replace the imaging controls and return the applied state.

```python
set_imaging(*, color: ColorImagingControl, depth: DepthImagingControl, ae_strategy: AutoExposureStrategy, timeout_ms: int = 2000) -> ImagingState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `color` | `ColorImagingControl` | (required) | Color imaging control |
| `depth` | `DepthImagingControl` | (required) | Depth imaging control |
| `ae_strategy` | `AutoExposureStrategy` | (required) | Auto-exposure strategy |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `ImagingState`

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `color` | `ColorImagingControl` | Color |
| `depth` | `DepthImagingControl` | Depth data |
| `ae_strategy` | `AutoExposureStrategy` | Auto-exposure strategy (`AutoExposureStrategy`) |

```python
from fabot.capabilities.camera import (
    AutoExposureStrategy, ColorImagingControl, DepthImagingControl, SensorExposureControl,
)

state = robot.head_camera.set_imaging(
    color=ColorImagingControl(exposure=SensorExposureControl(exposure_us=8000)),
    depth=DepthImagingControl(),
    ae_strategy=AutoExposureStrategy.MOTION_PRIORITY,
)
print(state.ae_strategy)
```

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### frameset()

Multi-stream frame-set stream.

```python
frameset(qos_profile: str = "latest") -> Channel
```

Frame payload is `FrameSet`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `sequence` | `int` | Sequence number increasing from 0 |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `sync_status` | `SyncStatus` | Multi-stream time pairing status (`SyncStatus`) |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `color` | `ImageFrame` | Color |
| `depth` | `ImageFrame` | Depth data |
| `registered_depth` | `ImageFrame` | Depth registered to color |
| `infrared` | `ImageFrame` | Infrared stream |
| `infrared_left` | `ImageFrame` | Left infrared stream |
| `infrared_right` | `ImageFrame` | Right infrared stream |
| `confidence` | `ImageFrame` | Confidence data |

### color()

Color image stream.

```python
color(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

```python
ch = robot.head_camera.color(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.width, frame.payload.height)
finally:
    ch.close()
```

### depth()

Raw depth stream.

```python
depth(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### registered_depth()

Depth registered to the color frame.

```python
registered_depth(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### infrared()

Infrared stream.

```python
infrared(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### infrared_left()

Left infrared stream.

```python
infrared_left(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### infrared_right()

Right infrared stream.

```python
infrared_right(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### confidence()

Confidence stream.

```python
confidence(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImageFrame`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `stream` | `StreamKind` | Stream kind (`StreamKind`) |
| `registered_to` | `StreamKind` | Registration target stream; `UNKNOWN` means unregistered |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `host_receive_stamp_ns` | `int` | Host receive time in ns |
| `exposure_duration_us` | `int` | Exposure duration in microseconds |
| `trigger_id` | `int` | Trigger id |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `format` | `PixelFormat` | Pixel format (`PixelFormat`) |
| `step` | `int` | Row stride in bytes |
| `is_bigendian` | `bool` | Whether big-endian |
| `depth_scale` | `float` | Depth scale in meters per LSB |
| `data` | `list[int]` | Audio bytes |

### points()

Point cloud stream.

```python
points(qos_profile: str = "latest") -> Channel
```

Frame payload is `PointCloud`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `sequence` | `int` | Sequence number increasing from 0 |
| `source_sequence` | `int` | Source frame sequence |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `calibration_generation` | `int` | Calibration generation; a change means intrinsics must be re-read |
| `decimation` | `int` | Point cloud decimation stride |
| `positions` | `list[float]` | Position list; point clouds store X/Y/Z interleaved |
| `colors` | `list[int]` | Color list, RGB interleaved |

### imu()

IMU sample stream.

```python
imu(qos_profile: str = "latest") -> Channel
```

Frame payload is `ImuSample`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `sequence` | `int` | Sequence number increasing from 0 |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |
| `clock_domain` | `str` | Clock domain of the timestamp |
| `clock_quality` | `ClockQuality` | Timestamp quality (`ClockQuality`) |
| `sensor_stamp_ns` | `int` | Sensor-side capture time in ns |
| `linear_acceleration` | `Vector3d` | Linear acceleration in m/s² |
| `angular_velocity` | `Vector3d` | Angular velocity in rad/s |
| `temperature_c` | `float` | Temperature in Celsius |

### rtsp()

RTSP preview endpoint; it publishes media descriptors rather than image frames.

```python
rtsp(qos_profile: str = "latest") -> Channel
```

Frame payload is `MediaEndpoint`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `uri` | `str` | Image, video, or audio URI |
| `protocol` | `MediaProtocol` | Media protocol (`MediaProtocol`) |
| `codec` | `VideoCodec` | Video codec (`VideoCodec`) |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `fps` | `int` | Frame rate |
| `bitrate_bps` | `int` | Bitrate in bits per second |
| `lease_id` | `str` | Stream lease id |
| `pipeline_generation` | `int` | Pipeline generation; a change means the preview must renegotiate |

### webrtc()

WebRTC preview endpoint; it publishes media descriptors rather than image frames.

```python
webrtc(qos_profile: str = "latest") -> Channel
```

Frame payload is `MediaEndpoint`:

| Field | Type | Description |
|------|------|------|
| `slot` | `str` | Slot id |
| `uri` | `str` | Image, video, or audio URI |
| `protocol` | `MediaProtocol` | Media protocol (`MediaProtocol`) |
| `codec` | `VideoCodec` | Video codec (`VideoCodec`) |
| `width` | `int` | Width in pixels |
| `height` | `int` | Height in pixels |
| `fps` | `int` | Frame rate |
| `bitrate_bps` | `int` | Bitrate in bits per second |
| `lease_id` | `str` | Stream lease id |
| `pipeline_generation` | `int` | Pipeline generation; a change means the preview must renegotiate |

## Events

Subscribe through `robot.<slot>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

| Entry | Event type | payload |
|------|------|------|
| `robot.<slot>.events.camera_session_changed` | `CameraSessionChangedEvent` | `camera_session_changed` |
| `robot.<slot>.events.camera_calibration_changed` | `CameraCalibrationChangedEvent` | `camera_calibration_changed` |
| `robot.<slot>.events.camera_device_connection_changed` | `CameraDeviceConnectionChangedEvent` | `camera_device_connection_changed` |
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`: `Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot` |

### camera_session_changed

Pushed when the session state changes; the payload is a `SessionState`.

### camera_calibration_changed

Pushed when the calibration changes; the payload is a `CameraCalibration`. Re-read intrinsics and extrinsics on receipt.

### camera_device_connection_changed

Pushed when the device connects or disconnects; the payload is a `DeviceConnectionEvent`.

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
| `state` | `str` | `disconnected` | `disconnected` / `idle` / `streaming` / `fault` |
| `sync_mode` | `str` | `standalone` | `standalone` / `primary` / `secondary` / `hardware_trigger` / `software_trigger` |
| `registration_mode` | `str` | `none` | `none` / `hardware` / `software` |
| `color_active` | `bool` | `False` |  |
| `depth_active` | `bool` | `False` |  |
| `infrared_active` | `bool` | `False` |  |
| `imu_active` | `bool` | `False` |  |
| `calibration_generation` | `uint64` | `0` | Calibration generation; a change means intrinsics must be re-read |
| `temperature_c` | `float` | `0.0` | Temperature in Celsius |

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

`open` / `close` / `set_imaging` share the `camera_device` resource with policy `queue`; `capture` / `trigger` and the other commands hold no resource.
