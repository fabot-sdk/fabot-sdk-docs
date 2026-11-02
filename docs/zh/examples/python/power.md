---
title: 电源
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 电源

读取两路电源的电量与充电状态，并订阅故障与生命周期事件。电源能力没有 Command / Operation 与数据通道，只有只读查询与事件；事件模型见 [事件与数据通道](../../usage/events-channels.md)，故障与生命周期见 [状态、故障与生命周期](../../usage/status-faults.md)，接口与字段见 [电源](../../reference/python/power.md)。

## 读取电量与充电状态

`robot.power_1` / `robot.power_2` 是两路各自独立的电源槽位。`status()` 返回 `Status` 快照：`energy`（电量）/ `voltage`（电压）/ `current`（电流）/ `temperature`（温度）/ `is_charging`（是否正在充电）。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1", "power_2"])

    for rail in (robot.power_1, robot.power_2):
        st = rail.status()
        print(rail.id, st.energy, st.voltage, st.current, st.temperature, st.is_charging)
```

## 从整机状态袋一次读两路

`robot.status()` 聚合了所有提供 `status()` 的能力，一次拿全：

```python
agg = robot.status()
print(agg.generation, agg.revision)
print(agg.power_1.energy, agg.power_2.energy)
print(agg.head_camera.state, agg.screen.activity)
```

## 监控低电量

电源没有事件流，需要自己轮询。把轮询放在自己的线程或定时器里，不要在事件回调中做：

```python
import threading
import time

def watch(robot, threshold=20, interval=5.0):
    while True:
        if robot.power_1.status().energy < threshold:
            robot.logs.warn("battery low", component="app", slot="power_1")
        time.sleep(interval)

threading.Thread(target=watch, args=(robot,), daemon=True).start()
```

`robot.logs.warn(...)` 的自定义日志会进入同一套日志流，见 [日志、指标与可观测性](../../usage/observability.md)。

## 订阅故障与生命周期

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health, snap.pbit_completed)

token = robot.power_1.events.lifecycle_changed.subscribe(on_lifecycle)
```
