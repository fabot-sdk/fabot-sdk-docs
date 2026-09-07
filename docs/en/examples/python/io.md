---
title: IO Pins
status: draft
owner: fabot-core
updated: 2026-09-07
---

# IO Pins

Acquire a digital pin, write a level, then read it back. See [IO](../../reference/python/io.md) for the API.

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
    try:
        applied = robot.io.set_level(pin=17, value=True)
        print(applied.outcome.success, applied.pin, applied.value)

        level = robot.io.get_level(pin=17)
        print("pin 17 =", level.value)
    finally:
        robot.io.release(pin=17)
```

Pin numbers are robot-specific. Acquire before reading or writing: `set_level` only works on a pin acquired as `OUTPUT`; `get_level` works on either `INPUT` or `OUTPUT`. Claiming the same pin again with the same direction succeeds; to change direction, `release` first. `UNKNOWN` is not a legal direction.
