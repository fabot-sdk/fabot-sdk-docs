---
title: 导航
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 导航

执行导航任务并跟踪进度。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [底盘](../../reference/python/chassis.md)。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    op = robot.chassis.navigate_to_station(station_id="charging")
    for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
        print("state:", snap.state, "progress:", snap.feedback)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("到达:", snap.result)
    else:
        print("失败:", snap.error)
```
