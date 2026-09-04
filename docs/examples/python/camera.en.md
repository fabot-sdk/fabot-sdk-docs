---
title: Camera
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Camera

Capture image frames, subscribe to camera image streams, and get preview playback URLs. The camera has four slots (`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`) — one API set, each an independent camera. For the channel model see [Events and Channels](../../usage/events-channels.md); for interfaces and fields see [Camera](../../reference/python/camera.md).

## Capture a Frame Set

`capture` grabs the current color + depth frame pair and returns a `CaptureT`: check the result via `outcome`; the image frames live in `color` / `depth`. `synchronized` tells whether the two frames were captured in sync.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    shot = robot.head_camera.capture()
    if shot.outcome is not None and shot.outcome.success:
        color = shot.color
        print("Color frame:", color.width, "x", color.height, color.encoding,
              "| synchronized:", shot.synchronized)
        if shot.depth is not None:
            print("Depth frame:", shot.depth.width, "x", shot.depth.height)
    else:
        msg = shot.outcome.statusMessage if shot.outcome else "no result"
        print("Capture failed:", msg)
```

Notes:

- Capture returns whole-frame pixel bytes (`ImageFrameT.data`) and is bulky — use it for occasional snapshots only; subscribe to a channel for live video.
- When you need only color or only depth, use `capture_color` / `capture_depth` (returning `image` / `outcome`) to avoid transferring the stream you do not need.
- Capture and channel subscriptions do not take the `camera_control` resource; see [Camera](../../reference/python/camera.md).

## Subscribe to the Frame Set Stream

`frameset()` subscribes to the frame set stream; each set contains color / depth / infrared frames (`CameraFrameSetT`). Iterate with `frames()`, then `close()`.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    ch = robot.head_camera.frameset(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            fs = frame.payload
            color = fs.color
            print("Frame set", frame.sequence,
                  "| synchronized:", fs.synchronized,
                  "| color:", f"{color.width}x{color.height}" if color else None)
            if frame.sequence >= 30:   # demo: first 30 sets only
                break
    finally:
        ch.close()
```

Notes:

- For a single color or depth stream, use the `color()` / `depth()` channel instead — its `payload` is directly an `ImageFrameT`, saving bandwidth.
- `qos_profile` is one of `"latest"` (latest only) / `"realtime"` / `"reliable"`; for iteration parameters and general conventions see [Events and Channels](../../usage/events-channels.md).

## Open a Camera Session and Get a Preview URL

When you need a specific resolution / frame rate, first `open` a session with stream profiles (it shares the `camera_control` resource, so requests are queued), then `close` when done. For desktop preview, use the `rtsp()` channel to get a playback URL (an info-only channel with no frame iteration).

```python
from fabot import Robot
from fabot.capabilities.camera import StreamKind, StreamProfileT

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    profile = StreamProfileT()
    profile.stream = StreamKind.COLOR
    profile.width, profile.height, profile.fps = 1280, 720, 30
    profile.encoding = "rgb8"

    session = robot.head_camera.open(profiles=[profile], enable_sync=True)
    print("Session state:", session.state, "| slot:", session.cameraSlot)
    if session.outcome is not None:
        print("Result:", session.outcome.success, session.outcome.statusMessage)

    with robot.head_camera.rtsp() as ch:
        print("RTSP preview URL:", ch.info.url)

    robot.head_camera.close()
```
