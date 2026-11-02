---
title: Screen
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Screen

Control the face screen: overlay text, images, video and the battery readout. The write model is in [Commands & Operations](../../usage/commands-operations.md), the API in [Screen](../../reference/python/screen.md).

## Show text and images

The background image and the overlay text are independent: `show_image` sets the background and `show_text` overlays text without interrupting it. Every write returns a `ScreenStatusApplied`; `outcome.success` is the result and `status` the applied screen snapshot.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    robot.screen.show_image("https://example.com/idle.png")
    applied = robot.screen.show_text("Heading to station 3")
    print(applied.outcome.success, applied.status.overlay_text, applied.status.content)

    robot.screen.set_battery(76)          # sync the battery readout
```

`status.content` is the `ScreenContent` enum (`IDLE` / `IMAGE` / `VIDEO`).

## Play a video, then stop

```python
applied = robot.screen.play_video("https://example.com/loop.mp4", loop=True)
print(applied.status.content, applied.status.playing)

robot.screen.stop()
print(robot.screen.get_status().status.content)     # back to IDLE
```

## Read state

`status()` gives the capability status bag (`activity`: `idle` / `image` / `video`) and `get_status()` the full screen snapshot:

```python
print(robot.screen.status().activity)       # Activity is a StrEnum and compares with strings

snapshot = robot.screen.get_status().status
print(snapshot.content, snapshot.uri, snapshot.overlay_text, snapshot.battery_percent)
```

Write commands share the `display` resource with policy `queue`, so consecutive writes run in order; `get_status()` holds no resource.
