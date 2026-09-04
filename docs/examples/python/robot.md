---
title: 急停
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 急停

订阅整机急停与故障事件，并演示触发 / 解除急停的完整流程。事件模型见 [事件与数据通道](../../usage/events-channels.md)，故障与生命周期见 [状态、故障与生命周期](../../usage/status-faults.md)，接口与字段见 [Robot](../../reference/python/robot.md)。

## 订阅急停与故障事件

`robot.events.estop_changed` 推送急停闩锁变化（`EstopChangedEvent.estop` 为 `EstopState` 快照），`robot.events.faults_changed` 推送整机故障聚合变化。两者都是整机事件，连接建立后即可订阅，无需 `wait_ready()` 等待能力槽位。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。

```python
from fabot import Robot
from fabot.core.event_types import EstopChangedEvent, FaultsChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(e: EstopChangedEvent):
        s = e.estop
        print("急停变化: asserted =", s.asserted, "reason =", s.reason, "source =", s.source_id)

    def on_faults(e: FaultsChangedEvent):
        for f in e.faults.faults:
            print("故障:", f.capability_id, f.fault_id, f.fault_class)

    robot.events.estop_changed.subscribe(on_estop)
    robot.events.faults_changed.subscribe(on_faults)
    input("按回车退出...\n")
```

`with` 退出时 `robot.close()` 会统一关闭全部订阅，无需逐个 `token.close()`。`EstopState` 的 `reason` / `source_id` 记录触发原因与来源，可据此区分本次触发是否来自 SDK 调用。

## 触发、解除与恢复

`robot.estop` 的 `engage` / `release` / `state` 均返回最新 `EstopState` 快照。`engage` 触发整机急停闩锁，整机运行状态进入 `RobotRunState.Estopped`；恢复步骤：确认现场安全后 `release`，再查 `robot.state()` 确认已脱离急停，并用 `robot.faults()` 检查急停期间记录的故障。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    state = robot.estop.engage(reason="safety check", source="demo")
    print("急停已触发:", state.asserted, "| reason:", state.reason)

    input("确认现场安全后按回车解除...\n")

    state = robot.estop.release(reason="check done", source="demo")
    print("急停已解除:", not state.asserted)

    if robot.state().is_estopped:
        print("整机仍处于 Estopped:", robot.state().reasons)

    faults = robot.faults()
    print("故障修订号:", faults.revision)
```

注意：`robot.faults()` 返回按槽位组织的 `RobotFaults`（`revision` + 22 个槽位故障袋，字段见 [Robot](../../reference/python/robot.md)），而 `faults_changed` 事件的 `faults` 是故障记录列表（`RobotFaultSnapshot`），两者形态不同。
