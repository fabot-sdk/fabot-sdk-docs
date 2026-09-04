---
title: 灯效 Light
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 灯效 Light

## 模块概述

- 能力 id：`light`；槽位：`robot.light`
- 灯带控制：灯效模式、颜色、亮度、动画周期。五个方法均为短命令；写命令返回生效后的灯带快照。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `set_mode` | `mode`, `color`, `period_ms` | `LightStatusAppliedT` | Command |
| `set_color` | `r`, `g`, `b` | `LightStatusAppliedT` | Command |
| `set_brightness` | `brightness` | `LightStatusAppliedT` | Command |
| `set_period` | `period_ms` | `LightStatusAppliedT` | Command |
| `get_status` | — | `LightStatusAppliedT` | Command |

Command 默认 `timeout_ms` 均为 1000（可覆盖）。参数均为关键字参数。

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

`LightMode` 枚举：

| 取值 | 说明 |
|------|------|
| `OFF` | 关灯（忽略颜色） |
| `SOLID` | 常亮 |
| `BLINK` | 闪烁 |
| `BREATHE` | 呼吸 |
| `RAINBOW` | 彩虹（忽略颜色） |
| `CHASE` | 追逐 |

`UNKNOWN` 不是合法命令值，传入会被拒绝。

写命令与 `get_status` 的返回类型同为 `LightStatusAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `status` | `LightStatusT` \| `None` | 生效后的灯带快照 |

`LightStatusT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `LightMode` | 当前灯效模式 |
| `color` | `Rgb8T` | 当前颜色：`r` / `g` / `b`，各 0–255 |
| `brightness` | `int` | 亮度，0–255 |
| `periodMs` | `int` | 动画周期（毫秒） |
| `ledCount` | `int` | 灯带 LED 数量 |

### set_mode

切换灯效模式，同时设置颜色与动画周期；不改变亮度。

```python
set_mode(*, mode: LightMode, color: Rgb8T, period_ms: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `LightMode` | （必填） | 灯效模式；`OFF` / `RAINBOW` 忽略颜色 |
| `color` | `Rgb8T` | （必填） | 颜色：`r` / `g` / `b`，各 0–255 |
| `period_ms` | `int` | （必填） | 动画周期（毫秒）；对 `OFF` / `SOLID` 无可见效果 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`LightStatusAppliedT`：`outcome` / `status`，字段见上表。

```python
from fabot.capabilities.light import LightMode
from fabot.types.Rgb8 import Rgb8T

color = Rgb8T()
color.r, color.g, color.b = 255, 0, 0
applied = robot.light.set_mode(mode=LightMode.BREATHE, color=color, period_ms=2000)
print(applied.outcome.success, applied.status.mode, applied.status.periodMs)
```

### set_color

只改颜色，模式不变。

```python
set_color(*, r: int, g: int, b: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `r` / `g` / `b` | `int` | （必填） | 颜色分量，各 0–255 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`LightStatusAppliedT`：`outcome` / `status`。

```python
applied = robot.light.set_color(r=0, g=255, b=0)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### set_brightness

只改亮度，模式不变。

```python
set_brightness(*, brightness: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `brightness` | `int` | （必填） | 亮度，0–255 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`LightStatusAppliedT`：`outcome` / `status`。

```python
applied = robot.light.set_brightness(brightness=128)
print(applied.outcome.success, applied.status.brightness)
```

### set_period

只改动画周期，模式不变；对 `OFF` / `SOLID` 无可见效果。

```python
set_period(*, period_ms: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `period_ms` | `int` | （必填） | 动画周期（毫秒） |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`LightStatusAppliedT`：`outcome` / `status`。

```python
applied = robot.light.set_period(period_ms=500)
print(applied.outcome.success, applied.status.periodMs)
```

### get_status

读取当前灯带快照。

```python
get_status(*, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`LightStatusAppliedT`：当前快照在 `status` 字段。

```python
applied = robot.light.get_status()
status = applied.status
print(status.mode, status.brightness, status.periodMs, status.ledCount)
print(status.color.r, status.color.g, status.color.b)
```

## 通道

本模块没有数据通道。灯带状态用 `get_status` 查询；故障与生命周期变化经事件推送，见下文。

## 事件

经 `robot.light.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.light.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.light.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.light.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.light.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.light.faults()`，返回 `Faults`。

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

本模块没有 `status()`；灯带状态用上文 `get_status` 查询，整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

五个方法均为短命令，没有长时任务；本模块未声明独占资源，命令之间没有排队或互斥约束。
