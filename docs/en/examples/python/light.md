---
title: Light
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Light

Control the light strip: mode, color, brightness and animation period. All five methods are short commands; the command model is in [Commands & Operations](../../usage/commands-operations.md) and the API in [Light](../../reference/python/light.md).

## Set mode and color

`set_mode` switches mode, color and animation period together; the color is an `Rgb8` (`r` / `g` / `b`, each 0–255). Writes return the applied strip snapshot (`outcome` plus `status`).

```python
from fabot import Robot
from fabot.capabilities.light import LightMode
from fabot.types import Rgb8

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["light"])

    applied = robot.light.set_mode(
        LightMode.BREATHE,
        color=Rgb8(r=255, g=0, b=0),
        period_ms=2000,
    )
    print(applied.outcome.success, applied.status.mode, applied.status.period_ms)
```

`LightMode` is `OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE`. `OFF` and `RAINBOW` ignore the color, and `UNKNOWN` is not a legal command value.

## Adjust color, brightness and period separately

Each of these changes one aspect and keeps the rest:

```python
robot.light.set_color(r=0, g=255, b=0)
robot.light.set_brightness(128)
robot.light.set_period(500)

status = robot.light.get_status().status
print(status.mode, status.color, status.brightness, status.period_ms, status.led_count)
```

## Turn the strip off

```python
from fabot.types import Rgb8

robot.light.set_mode(LightMode.OFF, color=Rgb8(r=0, g=0, b=0))
```

The strip has no data channel and no long-running task; read state with `get_status()`, and fault or lifecycle changes arrive through `robot.light.events`.
