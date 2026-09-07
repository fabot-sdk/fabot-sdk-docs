---
title: IO 引脚
status: draft
owner: fabot-core
updated: 2026-09-07
---

# IO 引脚

占用数字引脚、写电平、再读回确认。接口见 [IO](../../reference/python/io.md)。

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

脚号由机器人接线决定。须先 `acquire` 再读写：`set_level` 只适用于已占用为 `OUTPUT` 的脚；`get_level` 在 `INPUT` / `OUTPUT` 上均可。同脚同方向再次 `acquire` 会成功；要改方向须先 `release`。`UNKNOWN` 不是合法方向。
