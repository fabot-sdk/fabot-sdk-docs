---
title: Light
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Light

Control the light strip: switch the effect mode, color, brightness, and animation period. All five light methods are short commands — see [Commands & Operations](../../usage/commands-operations.md) for the command model and [Light](../../reference/python/light.md) for the API.

## Set Effect Mode and Color

`set_mode` switches mode, color, and animation period in one call; the color is an `Rgb8T` (`r` / `g` / `b`, each 0–255). Write commands return a snapshot of the strip after it takes effect.

```python
from fabot import Robot
from fabot.capabilities.light import LightMode
from fabot.types.Rgb8 import Rgb8T

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["light"])

    red = Rgb8T()
    red.r, red.g, red.b = 255, 0, 0
    applied = robot.light.set_mode(mode=LightMode.BREATHE, color=red, period_ms=2000)
    print(applied.outcome.success, applied.outcome.statusMessage)
    print(applied.status.mode, applied.status.periodMs, applied.status.ledCount)
```

Notes:

- `LightMode` values: `OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE`. `OFF` / `RAINBOW` ignore the color, and `period_ms` has no visible effect on `OFF` / `SOLID` — the full enum table is under [Light](../../reference/python/light.md).
- `set_mode` does not change brightness; adjust it separately with `set_brightness`.

## Tune Color, Brightness, and Period

To change a single field without touching the mode, use the matching command:

```python
applied = robot.light.set_color(r=0, g=255, b=0)      # color only
print(applied.outcome.success, applied.status.color.g)

applied = robot.light.set_brightness(brightness=128)  # brightness only (0-255)
print(applied.status.brightness)

applied = robot.light.set_period(period_ms=500)       # animation period only (ms)
print(applied.status.periodMs)
```

## Read Current Strip Status

```python
applied = robot.light.get_status()
status = applied.status
print(status.mode, status.brightness, status.periodMs)
print(status.color.r, status.color.g, status.color.b)
```

`get_status` and the three write commands all return `LightStatusAppliedT` (`outcome` / `status`); the full field list is under [Light get_status](../../reference/python/light.md#get_status).
