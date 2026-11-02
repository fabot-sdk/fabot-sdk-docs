---
title: IO Pins
status: draft
owner: fabot-core
updated: 2026-11-02
---

# IO Pins

Acquire a digital pin, write a level, then read it back. The API is in [IO](../../reference/python/io.md).

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    robot.io.acquire(17, direction=PinDirection.OUTPUT)
    try:
        applied = robot.io.set_level(17, value=True)
        print("write:", applied.outcome.success, applied.value)

        level = robot.io.get_level(17)
        print("read back:", level.value)
    finally:
        robot.io.release(17)
```

## Reading an external input

A pin acquired as `PinDirection.INPUT` is read only with `get_level`, never with `set_level`:

```python
robot.io.acquire(18, direction=PinDirection.INPUT)
try:
    print(robot.io.get_level(18).value)
finally:
    robot.io.release(18)
```

Notes:

- Repeating `acquire` with the same pin and direction is idempotent; to change direction you must `release` first.
- Calling `set_level` / `get_level` on a pin that is not acquired is rejected: `outcome.success` is `False` with a status message.
- `PinDirection.UNKNOWN` is not a legal command value and is rejected.
- Pin numbers depend on the robot wiring; `17` / `18` above are examples only.
