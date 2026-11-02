---
title: 灯效 Light
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 灯效 Light

## 模块概述

- 能力 id：`light`；槽位：`robot.light`
- 能力域：`light`；能力版本：`1.1.0`
- 灯带外观控制：模式、颜色、亮度与动画周期，最后一次写入生效。
- `OFF` 与 `RAINBOW` 忽略颜色；`UNKNOWN` 不是合法命令值。

写命令与 `get_status` 的返回类型同为 `LightStatusApplied`（`outcome` + `status`）。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `set_mode` | `LightModeChange` | `LightStatusApplied` | 1000 ms |
| `set_color` | `Rgb8` | `LightStatusApplied` | 1000 ms |
| `set_brightness` | `Brightness` | `LightStatusApplied` | 1000 ms |
| `set_period` | `Period` | `LightStatusApplied` | 1000 ms |
| `get_status` | `Empty` | `LightStatusApplied` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

本页方法用到的枚举：

**`LightMode` 枚举**

| 取值 | 说明 |
|------|------|
| `OFF` | 关灯（忽略颜色） |
| `SOLID` | 常亮 |
| `BLINK` | 闪烁 |
| `BREATHE` | 呼吸 |
| `RAINBOW` | 彩虹（忽略颜色） |
| `CHASE` | 追逐 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### set_mode

切换灯效模式，同时设置颜色与动画周期；不改变亮度。

```python
set_mode(mode: LightMode, *, color: Rgb8, period_ms: int = 0, target_light: int = 0, timeout_ms: int = 1000) -> LightStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `LightMode` | （必填） | 模式取值 |
| `color` | `Rgb8` | （必填） | 彩色成像控制 |
| `period_ms` | `int` | `0` | 动画周期（毫秒） |
| `target_light` | `int` | `0` | 目标灯带编号；0 表示缺省 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LightStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `LightStatus` | 状态快照 |

```python
from fabot.capabilities.light import LightMode
from fabot.types import Rgb8

applied = robot.light.set_mode(LightMode.BREATHE, color=Rgb8(r=255, g=0, b=0), period_ms=2000)
print(applied.outcome.success, applied.status.mode, applied.status.period_ms)
```

### set_color

只改颜色。

```python
set_color(*, r: int, g: int, b: int, timeout_ms: int = 1000) -> LightStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `r` | `int` | （必填） | 红色分量，0–255 |
| `g` | `int` | （必填） | 绿色分量，0–255 |
| `b` | `int` | （必填） | 蓝色分量，0–255 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LightStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `LightStatus` | 状态快照 |

### set_brightness

只改亮度。

```python
set_brightness(brightness: int, *, timeout_ms: int = 1000) -> LightStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `brightness` | `int` | （必填） | 亮度，0–255 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LightStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `LightStatus` | 状态快照 |

### set_period

只改动画周期；对 `OFF` / `SOLID` 无可见效果。

```python
set_period(period_ms: int, *, timeout_ms: int = 1000) -> LightStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `period_ms` | `int` | （必填） | 动画周期（毫秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LightStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `LightStatus` | 状态快照 |

### get_status

读取当前灯带快照。`get_state` 是别名。

```python
get_status(*, timeout_ms: int = 1000) -> LightStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LightStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `LightStatus` | 状态快照 |

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

本模块没有 `status()`；整机聚合状态见 `robot.status()`。

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

五个方法都是短命令，没有长时任务，也不占独占资源；命令之间没有排队或互斥约束。
