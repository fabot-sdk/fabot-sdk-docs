---
title: IO Stream
status: draft
owner: fabot-core
updated: 2026-09-04
---

# IO Stream

Collect the level-change stream of IO digital channels and filter by edge type. See [Events & Data Channels](../../usage/events-channels.md) for channels and QoS, and [IO](../../reference/python/io.md) for the API.

```python
from fabot import Robot
from fabot.capabilities.io import DigitalEdge

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    ch = robot.io.digital_events(qos_profile="realtime")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=10000):
            p = frame.payload
            if p.edge == DigitalEdge.RISING:
                print(p.channel, "rising ->", p.value, "at", p.timestampNs, "ns")
            elif p.edge == DigitalEdge.FALLING:
                print(p.channel, "falling ->", p.value, "at", p.timestampNs, "ns")
    finally:
        ch.close()
```

`qos_profile` is a string (`"latest"` / `"realtime"` / `"reliable"`), not an enum. `payload` is a `DigitalEventT`: `channel` / `value` / `edge` / `timestampNs`; `edge` is one of `DigitalEdge.UNKNOWN` / `RISING` / `FALLING`, and the first sample is typically `UNKNOWN` because there is no prior level. To read or write individual digital / analog channels, use Commands such as `get_digital_input` / `set_digital_output` / `get_analog_input` / `set_analog_output`; see [IO](../../reference/python/io.md).
