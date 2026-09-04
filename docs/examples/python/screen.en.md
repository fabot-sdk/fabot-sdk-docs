---
title: Screen
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Screen

Control the robot face screen: overlay text, image and video backgrounds, and a bottom battery bar. See [Commands & Operations](../../usage/commands-operations.md) for the write-operation model and [Screen](../../reference/python/screen.md) for the API.

## Overlay Text on an Image

The background image and the overlay text are independent: `show_image` sets the background, and `show_text` draws a text layer on top without interrupting it. Every write returns `ScreenStatusAppliedT`: `outcome.success` is the result, `status` is the screen snapshot after applying.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    applied = robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
    print(applied.outcome.success, applied.status.content)   # 2 (IMAGE)

    applied = robot.screen.show_text(text="Task in progress")
    print(applied.outcome.success, applied.status.overlayText)

    # An empty string closes the overlay; the background image stays
    robot.screen.show_text(text="")
```

Notes:

- `content` takes values from `ScreenContent`: `IDLE` (1) / `IMAGE` (2) / `VIDEO` (3); compare after `from fabot.capabilities.screen import ScreenContent`.
- Screen writes share a single display resource: new commands queue and never run concurrently; `get_status` is a read-only query and does not queue — see [Screen](../../reference/python/screen.md).

## Loop a Video with a Battery Bar

`play_video` returns immediately; with `loop=True` the video repeats until replaced by new content or stopped with `stop()`. The battery bar is independent of the visual content: `percent` of 0–100 shows it, a negative value hides it.

```python
from fabot import Robot
from fabot.capabilities.screen import ScreenContent

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    applied = robot.screen.play_video(
        uri="file:///usr/share/fabot/media/intro.mp4", loop=True,
    )
    print(applied.outcome.success, applied.status.playing)

    robot.screen.set_battery(percent=80)

    # Read the current screen snapshot
    st = robot.screen.get_status().status
    print(st.content == ScreenContent.VIDEO, st.uri, st.playing, st.batteryPercent)

    # Stop playback and hide the battery bar
    robot.screen.stop()
    robot.screen.set_battery(percent=-1)
```

With `loop=False`, the final frame behavior is not guaranteed (it may hold the last frame or go black), but the command still returns immediately — see [Screen play_video](../../reference/python/screen.md#play_video).
