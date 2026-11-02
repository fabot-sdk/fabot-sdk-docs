---
title: 面屏 Screen
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 面屏 Screen

## 模块概述

- 能力 id：`screen`；槽位：`robot.screen`
- 能力域：`screen`；能力版本：`1.1.0`
- 面屏内容控制：文本叠加、图片、视频与播放停止，并可同步显示的电量百分比。
- `status()` 给出当前内容类型（`Activity`：`idle` / `image` / `video`）。

除 `get_status` 外的写命令共用资源 `display`，策略 `queue`。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `show_text` | `OverlayText` | `ScreenStatusApplied` | 1000 ms |
| `show_image` | `Image` | `ScreenStatusApplied` | 3000 ms |
| `play_video` | `VideoPlayback` | `ScreenStatusApplied` | 3000 ms |
| `stop` | `Empty` | `ScreenStatusApplied` | 1000 ms |
| `get_status` | `Empty` | `ScreenStatusApplied` | 1000 ms |
| `set_battery` | `BatteryLevel` | `ScreenStatusApplied` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### show_text

在面屏上叠加文本。

```python
show_text(text: str, *, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `text` | `str` | （必填） | 要显示的文本 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

```python
applied = robot.screen.show_text("Hello, fabot!")
print(applied.status.overlay_text, applied.status.content)
```

### show_image

在面屏上显示图片。

```python
show_image(uri: str, *, timeout_ms: int = 3000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 资源地址 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

### play_video

播放视频，`loop=True` 表示循环。

```python
play_video(uri: str, *, loop: bool = True, timeout_ms: int = 3000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 资源地址 |
| `loop` | `bool` | `True` | 是否循环播放 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

### stop

停止当前内容。

```python
stop(*, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

### get_status

读取面屏状态快照。`get_state` 是别名。

```python
get_status(*, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

### set_battery

同步面屏上显示的电量百分比。

```python
set_battery(percent: int, *, timeout_ms: int = 1000) -> ScreenStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `percent` | `int` | （必填） | 电量百分比，0–100 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ScreenStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `ScreenStatus` | 状态快照 |

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
| `activity` | `str` | `idle` | `idle` / `image` / `video` |

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

`show_text` / `show_image` / `play_video` / `stop` / `set_battery` 共用资源 `display`，策略 `queue`；`get_status` 不占资源。
