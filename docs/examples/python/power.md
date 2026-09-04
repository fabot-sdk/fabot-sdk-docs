---
title: 电源
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 电源

读取两路电源的电量与充电状态，并订阅故障与生命周期事件。电源能力没有 Command / Operation 与数据通道，只有只读查询与事件；事件模型见 [事件与数据通道](../../usage/events-channels.md)，故障与生命周期见 [状态、故障与生命周期](../../usage/status-faults.md)，接口与字段见 [电源](../../reference/python/power.md)。

## 读取电量与充电状态

`robot.power_1` / `robot.power_2` 是两路各自独立的电源槽位。`status()` 返回 `Status` 快照：`energy`（电量）/ `voltage`（电压）/ `current`（电流）/ `temperature`（温度）/ `is_charging`（是否正在充电）。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1", "power_2"])

    for slot in (robot.power_1, robot.power_2):
        st = slot.status()
        print(
            slot.slot_id,
            "电量:", st.energy,
            "电压:", st.voltage,
            "电流:", st.current,
            "温度:", st.temperature,
            "充电中:", st.is_charging,
        )
        if st.energy < 20 and not st.is_charging:
            print(slot.slot_id, "电量过低，请尽快充电")
```

注意：

- `status()` 无参数、即时返回当前快照；需要持续监控时自行轮询，电源没有数据通道。
- 两路电源互不影响，`power_1` 低电不代表 `power_2` 低电，请分别判断。

## 查询健康度与故障

`health()` / `lifecycle()` 是公共只读查询；`faults()` 返回 `Faults`，电源当前没有已命名故障，只有 `revision` 修订号。

```python
snap = robot.power_1.lifecycle()
print("生命周期:", snap.lifecycle, "健康度:", snap.health)

faults = robot.power_1.faults()
print("故障修订号:", faults.revision)
```

## 订阅故障与生命周期事件

`fault_changed` 在故障集合变化时推送，`lifecycle_changed` 在生命周期或健康度变化时推送。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。

```python
from fabot import Robot
from fabot.core.event_types import LifecycleChangedEvent
from fabot.capabilities.power import FaultChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1"])

    def on_fault(event: FaultChangedEvent):
        print(event.header.slot_id, "故障变化, revision =", event.faults.revision)

    def on_lifecycle(event: LifecycleChangedEvent):
        snap = event.lifecycle
        print(event.header.slot_id, "lifecycle =", snap.lifecycle, "health =", snap.health)

    robot.power_1.events.fault_changed.subscribe(on_fault)
    robot.power_1.events.lifecycle_changed.subscribe(on_lifecycle)
    input("按回车退出...\n")
```

`with` 退出时 `robot.close()` 会统一关闭全部订阅，无需逐个 `token.close()`。

## 相关链接

- [事件与数据通道](../../usage/events-channels.md)
- [状态、故障与生命周期](../../usage/status-faults.md)
- [电源 API 参考](../../reference/python/power.md)
