---
title: Screen
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Screen

## Module Overview

- Capability id: `screen`; slot: `robot.screen`
- Control the robot face screen display: text, images, video, and query the current playback status.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `show_text` | `text` | `ScreenStatusAppliedT` | Command |
| `show_image` | `uri` | `ScreenStatusAppliedT` | Command |
| `play_video` | `uri`, `loop` | `ScreenStatusAppliedT` | Command |
| `stop` | — | `ScreenStatusAppliedT` | Command |
| `get_status` | — | `ScreenStatusAppliedT` | Command |

## Methods

```python
robot.screen.show_text(text="Task in progress")
robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
robot.screen.play_video(uri="file:///usr/share/fabot/media/intro.mp4", loop=True)
robot.screen.stop()
```

## Channels

## Events

Fault and lifecycle changes are subscribed via `fault_changed` / `lifecycle_changed` on `robot.screen.events`; see [Events & Data Channels](../../usage/events-channels.md).

## Faults

## Status

This module provides GET-only `status()`:

```python
st = robot.screen.status()
print(st.activity)   # Activity.IDLE / IMAGE / VIDEO
```

## Resources
