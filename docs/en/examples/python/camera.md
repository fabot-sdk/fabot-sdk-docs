---
title: Camera
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Camera

Capture multi-stream frames, read calibration and intrinsics, control imaging parameters, and subscribe to image streams and preview endpoints. There are five camera slots (`head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera`) sharing one API on independent slots. The channel model is in [Events & Data Channels](../../usage/events-channels.md), and fields are in [Camera](../../reference/python/camera.md).

## Capture a frame set

`capture` returns a `FrameSet`: `color` / `depth` / `registered_depth` / `infrared` / left-right infrared / `confidence`, each an `ImageFrame` (`None` when the stream is absent), plus `sync_status` describing how those streams were paired in time. Cameras start streaming automatically once active, so `open()` is usually unnecessary.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    frame_set = robot.head_camera.capture()
    print("sequence:", frame_set.sequence, "sync:", frame_set.sync_status)

    if frame_set.color is not None:
        img = frame_set.color
        print(img.width, img.height, img.format, img.frame_id, img.stamp_ns)
        print(len(img.data), "bytes")
```

`capture(streams=[...])` restricts the streams; `wait_for_fresh=False` allows a cached frame, in which case `max_age_ms` bounds the accepted age.

```python
from fabot.capabilities.camera import StreamKind

depth_only = robot.head_camera.capture(streams=[StreamKind.DEPTH], max_age_ms=200)
```

## Read calibration and intrinsics

`get_calibration()` returns per-stream intrinsics, extrinsics, the stereo baseline and the depth scale in one call; `get_intrinsics` is an alias. A change in `generation` means the calibration was updated and should be re-read.

```python
calib = robot.head_camera.get_calibration()
print("generation:", calib.generation, "depth scale:", calib.depth_scale)
print("valid depth:", calib.min_depth_m, calib.max_depth_m)

intr = calib.color
print(intr.width, intr.height, intr.fx, intr.fy, intr.cx, intr.cy)
print("distortion model:", intr.distortion_model, "coeffs:", intr.distortion)

# Depth-to-color extrinsics
print(calib.depth_to_color.target_frame, calib.depth_to_color.source_frame)
print(calib.depth_to_color.tx, calib.depth_to_color.qw)
```

## Deproject depth into a point cloud

`fabot.frames` provides the pixel and depth geometry; combined with the calibration it turns a depth image into 3D points:

```python
from fabot.frames import deproject_depth_to_points, select_depth_intrinsics

frame_set = robot.head_camera.capture(streams=[StreamKind.DEPTH])
intr = select_depth_intrinsics(frame_set.depth, calib)
points = deproject_depth_to_points(frame_set.depth, intr, stride=2, max_depth=5.0)
print(points.shape)      # (N, 3) in meters, in the depth optical frame

# Then transform into the robot base frame
points_base = robot.frames.transform_points(points, "base_link", frame_set.depth.frame_id)
```

## Control imaging parameters

`set_imaging` replaces exposure / gain / white balance / mains frequency / emitter settings and returns the applied state:

```python
from fabot.capabilities.camera import (
    AutoExposureStrategy, ColorImagingControl, DepthImagingControl, ExposureMode,
    SensorExposureControl,
)

state = robot.head_camera.set_imaging(
    color=ColorImagingControl(
        exposure=SensorExposureControl(mode=ExposureMode.MANUAL, exposure_us=8000),
    ),
    depth=DepthImagingControl(),
    ae_strategy=AutoExposureStrategy.MOTION_PRIORITY,
)
print(state.ae_strategy)
```

Use the enum constants for enum fields (such as `ExposureMode.MANUAL`); passing a plain string fails during serialization.

## Software trigger

A camera whose sync role is `SOFTWARE_TRIGGER` can be triggered explicitly with `trigger()`:

```python
ack = robot.head_camera.trigger(frame_count=1)
print(ack.trigger_sequence, ack.accepted_at_ns)
```

## Subscribe to image streams

`color()` pushes `ImageFrame`, `frameset()` pushes whole `FrameSet`s, and `depth()` / `registered_depth()` / `infrared()` / left-right infrared / `confidence()` / `points()` / `imu()` cover the rest.

```python
ch = robot.head_camera.color(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.width, frame.payload.height)
finally:
    ch.close()
```

## Preview endpoints

`rtsp()` / `webrtc()` publish media endpoint descriptors (`MediaEndpoint`) rather than image frames, which is convenient when handing a URL to a player:

```python
ch = robot.head_camera.rtsp()
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.payload.uri, frame.payload.codec, frame.payload.width)
        break
finally:
    ch.close()
```

## Subscribe to camera events

Session and calibration changes have dedicated events, so no polling is needed:

```python
def on_session(event):
    st = event.camera_session
    print(st.state, st.registration_mode, st.calibration_generation)

def on_calibration(event):
    print("calibration updated:", event.camera_calibration.generation)

session_token = robot.head_camera.events.camera_session_changed.subscribe(on_session)
calib_token = robot.head_camera.events.camera_calibration_changed.subscribe(on_calibration)
```

Device connect / disconnect is reported by `camera_device_connection_changed` (payload `DeviceConnectionEvent`).
