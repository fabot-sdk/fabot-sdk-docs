---
title: 事件与数据通道
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 事件与数据通道

SDK 提供两种被动接收数据的机制：**事件（Event）** 是离散的语义消息（故障变化、急停触发等），**数据通道（Channel）** 是能力持续推送的数据流（IO 电平、关节位置等），带 QoS。

## 事件订阅

事件按来源分三层，订阅均返回 `SubscriptionToken`（用返回值或配对退订）：

| 层 | 入口 | 典型事件 |
|----|------|----------|
| 整机 | `robot.events` | `estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed` |
| 能力 | `robot.<slot>.events` | `fault_changed` / `lifecycle_changed`（见各模块文档） |
| 日志 | `robot.logs` | 平台/能力日志记录流 |

```python
# 订阅某类事件（类型化流）
token = robot.events.estop_changed.subscribe(on_estop, on_error=on_err)

# 订阅整机全部事件，自行判别类型
def on_event(event):
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        ...
token_all = robot.events.subscribe(on_event)

# 日志流
robot.logs.subscribe(on_log, min_level=LogLevel.WARN, slot="chassis")
```

!!! warning "回调线程约束"
    回调在 SDK 的 I/O 线程执行：保持轻量，禁止在回调内调用阻塞 API（会抛 `ClientThreadError`）。需要重处理时投递到自己的队列/线程。

## 数据通道（Channel）

提供数据通道的能力会生成类型化通道入口。用 `frames()` 迭代即可。

```python
ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)

for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload)
```

## QoS

`QosProfile` 三档：`Realtime`（最低延迟，允许丢帧）/ `Latest`（只保留最新）/ `Reliable`（尽力送达）。默认值见各模块文档，调用时可覆盖。

## 事件类型一览

平台事件类型（`fabot.core.event_types`）：`EstopChangedEvent`、`RobotStateChangedEvent`、`RegistryChangedEvent`、`ConfigChangedEvent`、`ServiceStateChangedEvent`、`FaultChangedEvent`、`FaultsChangedEvent`、`LifecycleChangedEvent`、`ManagerConnectionChangedEvent`。
