---
title: IO 引脚
status: draft
owner: fabot-core
updated: 2026-11-02
---

# IO 引脚

占用数字引脚、写电平、再读回确认。接口见 [IO](../../reference/python/io.md)。

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    robot.io.acquire(17, direction=PinDirection.OUTPUT)
    try:
        applied = robot.io.set_level(17, value=True)
        print("写入:", applied.outcome.success, applied.value)

        level = robot.io.get_level(17)
        print("读回:", level.value)
    finally:
        robot.io.release(17)
```

## 读取外部输入

`PinDirection.INPUT` 方向的引脚只用 `get_level` 读取，不能 `set_level`：

```python
robot.io.acquire(18, direction=PinDirection.INPUT)
try:
    print(robot.io.get_level(18).value)
finally:
    robot.io.release(18)
```

注意：

- `acquire` 同脚同方向重复调用是幂等的；要改方向必须先 `release`。
- 未占用的脚上调用 `set_level` / `get_level` 会被拒绝，`outcome.success` 为 `False` 并带状态说明。
- `PinDirection.UNKNOWN` 不是合法命令值，传入会被拒绝。
- 脚号由机器人接线决定，上面的 `17` / `18` 只是示例。
