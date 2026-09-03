---
title: IO 流
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO 流

采集 IO 数字量事件流。通道与 QoS 见 [事件与数据通道](../../usage/events-channels.md)，接口见 [IO](../../reference/python/io.md)。

```python
from fabot import Robot
from fabot.core.types import QosProfile

with Robot.connect("192.168.1.10", 7557) as robot:
    ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=10000):
        print(frame.channel_id, frame.payload)
    ch.close()
```
