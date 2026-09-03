---
title: 急停
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 急停

订阅急停与故障事件。事件模型见 [事件与数据通道](../../usage/events-channels.md)，故障与生命周期见 [状态、故障与生命周期](../../usage/status-faults.md)。

```python
from fabot import Robot
from fabot.core.event_types import EstopChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(e: EstopChangedEvent):
        print("急停状态变化:", e)

    token = robot.events.estop_changed.subscribe(on_estop)
    robot.wait_ready()
    input("按回车退出...\n")
```
