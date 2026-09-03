---
title: IO Stream
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO Stream

Collect an IO digital event stream. See [Events & Data Channels](../../usage/events-channels.md) for channels and QoS, and [IO](../../reference/python/io.md) for the API.

```python
from fabot import Robot
from fabot.core.types import QosProfile

with Robot.connect("192.168.1.10", 7557) as robot:
    ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=10000):
        print(frame.channel_id, frame.payload)
    ch.close()
```
