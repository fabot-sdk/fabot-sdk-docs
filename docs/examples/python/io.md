---
title: IO 流
status: draft
owner: fabot-core
updated: 2026-09-04
---

# IO 流

采集 IO 数字通道的电平变化流，并按边沿类型过滤。通道与 QoS 见 [事件与数据通道](../../usage/events-channels.md)，接口见 [IO](../../reference/python/io.md)。

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

`qos_profile` 是字符串（`"latest"` / `"realtime"` / `"reliable"`），不是枚举。`payload` 为 `DigitalEventT`：`channel` / `value` / `edge` / `timestampNs`；`edge` 取值 `DigitalEdge.UNKNOWN` / `RISING` / `FALLING`，首个样本因无历史电平通常为 `UNKNOWN`。读写单个数字 / 模拟通道用 `get_digital_input` / `set_digital_output` / `get_analog_input` / `set_analog_output` 等 Command，见 [IO](../../reference/python/io.md)。
