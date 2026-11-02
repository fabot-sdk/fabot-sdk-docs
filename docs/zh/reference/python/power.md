---
title: 电源 Power
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 电源 Power

## 模块概述

- 能力 id：`power`；槽位：`robot.power_1` / `robot.power_2`
- 能力域：`power`；能力版本：`1.1.0`
- 电池电量、电压、电流、温度与充电状态监控。两路电源是同一套 API、各自独立的槽位。
- 本模块没有 Command 与 Operation，只有状态袋与公共查询。

`id` 属性给出该槽位的电源编号（`power_1` 为 `"1"`）。

## API 总览

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

## 通道

本模块没有数据通道。通用机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.<slot>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`：`Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot` |

## 异常

查询入口 `robot.<slot>.faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的故障文本用 `Catalogs.format_fault(record, capability_id="...")`，见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 状态

`status()` 返回该能力的只读状态袋；整机聚合见 `robot.status()`。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `energy` | `int` | `0` | 电量 |
| `current` | `float` | `0.0` | 电流 |
| `voltage` | `float` | `0.0` | 电压 |
| `temperature` | `int` | `0` | 温度 |
| `is_charging` | `bool` | `False` | 是否正在充电 |

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

本模块只有只读的状态与故障查询，没有 Command 与 Operation，不涉及资源占用、排队或拒绝。
