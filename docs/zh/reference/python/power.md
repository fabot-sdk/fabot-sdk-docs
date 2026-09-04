---
title: 电源 Power
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 电源 Power

## 模块概述

- 能力 id：`power`；槽位：`robot.power_1` / `robot.power_2`
- 电池电量、电压、电流、温度与充电状态监控。两路电源是同一套 API、各自独立的槽位。

## API 总览

本模块没有 Command 与 Operation，也没有数据通道；只读查询 `status()` / `health()` / `lifecycle()` / `faults()` 见 [状态](#_6) 与 [异常](#_5)。

## 方法

本模块没有 Command 与 Operation。

只读查询：

- `status()`：电源状态快照，见 [状态](#_6)
- `health()` / `lifecycle()` / `faults()`：公共查询，见 [状态](#_6) 与 [异常](#_5)

## 通道

本模块没有数据通道。通用通道机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.power_1.events` / `robot.power_2.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.power_1.events.fault_changed.subscribe(callback)`（power_2 同理）。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.power_1.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.power_1.events.lifecycle_changed.subscribe(callback)`（power_2 同理）。

**payload**

`LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `lifecycle` | `LifecycleState` | 生命周期阶段 |
| `health` | `HealthState` | 健康度 |
| `source_instance_id` | `str` | 来源实例 id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.power_2.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.power_1.faults()` / `robot.power_2.faults()`，返回 `Faults`。

本模块尚无已命名故障：当前 `Faults` 只有 `revision`。变化通过 `fault_changed` 推送。通用约定见 [状态、故障与生命周期](../../usage/status-faults.md)。

若日后出现已命名故障，每条为 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `active` | `bool` | 是否仍在生效 |
| `catalog_id` | `str` | 目录 id |
| `fault_class` | `CapabilityStateClass` | 故障等级 |
| `first_seen_us` / `last_seen_us` | `int` | 首次 / 最近见到的时间戳（微秒） |
| `count` | `int` | 累计次数 |

## 状态

读取当前电源状态快照：

```python
status() -> Status
```

`status()` 无参数，返回 `Status`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `energy` | `int` | 电量 |
| `current` | `float` | 电流 |
| `voltage` | `float` | 电压 |
| `temperature` | `int` | 温度 |
| `is_charging` | `bool` | 是否正在充电 |

```python
st = robot.power_1.status()
print(st.energy, st.voltage, st.is_charging)
```

整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

本模块只有只读的状态与故障查询，没有 Command 与 Operation，不涉及资源占用、排队或拒绝。
