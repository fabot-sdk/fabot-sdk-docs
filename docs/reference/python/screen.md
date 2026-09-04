---
title: 面屏 Screen
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 面屏 Screen

## 模块概述

- 能力 id：`screen`；槽位：`robot.screen`
- 机器人面屏显示控制：叠加文本、图片、视频与底部电量条，并查询当前屏幕快照。背景内容（空闲 / 图片 / 视频）与叠加文本相互独立。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `show_text` | `text` | `ScreenStatusAppliedT` | Command |
| `show_image` | `uri` | `ScreenStatusAppliedT` | Command |
| `play_video` | `uri`, `loop` | `ScreenStatusAppliedT` | Command |
| `stop` | — | `ScreenStatusAppliedT` | Command |
| `get_status` | — | `ScreenStatusAppliedT` | Command |
| `set_battery` | `percent` | `ScreenStatusAppliedT` | Command |

Command 默认 `timeout_ms`：`show_image` / `play_video` 为 3000，其余为 1000（均可覆盖）。参数均为关键字参数。

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### show_text

设置叠加文本。空字符串关闭叠加层；不打断图片或视频背景内容。

```python
show_text(*, text: str, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `text` | `str` | （必填） | 叠加文本；空串关闭叠加层 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`（所有写操作与 `get_status` 共用此返回类型）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `status` | `ScreenStatusT` \| `None` | 应用后的屏幕快照，字段见下 |

`status`（`ScreenStatusT`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | `int` | 当前背景内容，取 `ScreenContent`：`UNKNOWN`（0）/ `IDLE`（1）/ `IMAGE`（2）/ `VIDEO`（3） |
| `uri` | `str` \| `None` | 当前图片 / 视频的 URI；空闲时为空 |
| `overlayText` | `str` \| `None` | 当前叠加文本；无叠加层时为空 |
| `playing` | `bool` | 视频是否正在播放 |
| `batteryPercent` | `int` | 底部电量条：0–100 显示，负数隐藏 |

```python
applied = robot.screen.show_text(text="任务执行中")
print(applied.outcome.success, applied.status.overlayText)
```

### show_image

显示图片并保持；默认不清除叠加文本。

```python
show_image(*, uri: str, timeout_ms: int = 3000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 图片 URI，支持 `file://` 等可解析 URI |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`：`outcome` / `status`，字段见 [show_text](#show_text)。

```python
applied = robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
print(applied.outcome.success, applied.status.content)
```

### play_video

播放视频，命令立即返回。`loop=True` 时循环播放，直到被新内容替换或 `stop()`；`loop=False` 播完后的画面表现不作保证（可能停在末帧或黑屏），命令仍立即返回。

```python
play_video(*, uri: str, loop: bool, timeout_ms: int = 3000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 视频 URI，支持 `file://` 等可解析 URI |
| `loop` | `bool` | （必填） | `True` 循环播放，`False` 播放一次 |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`：`outcome` / `status`，字段见 [show_text](#show_text)。

```python
applied = robot.screen.play_video(
    uri="file:///usr/share/fabot/media/intro.mp4", loop=True,
)
print(applied.outcome.success, applied.status.playing)
```

### stop

停止当前播放内容。

```python
stop(*, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`：`outcome` / `status`，字段见 [show_text](#show_text)。

```python
applied = robot.screen.stop()
print(applied.outcome.success)
```

### get_status

读取当前屏幕快照。

```python
get_status(*, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`：`outcome` / `status`，字段见 [show_text](#show_text)。

```python
applied = robot.screen.get_status()
st = applied.status
print(st.content, st.uri, st.overlayText, st.playing, st.batteryPercent)
```

### set_battery

设置底部电量条，与文本 / 图片 / 视频内容相互独立。`percent` 取 0–100 显示电量条，负数隐藏。

```python
set_battery(*, percent: int, timeout_ms: int = 1000) -> ScreenStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `percent` | `int` | （必填） | 电量百分比 0–100；负数隐藏电量条 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`ScreenStatusAppliedT`：`outcome` / `status`，字段见 [show_text](#show_text)。

```python
applied = robot.screen.set_battery(percent=80)
print(applied.outcome.success, applied.status.batteryPercent)
```

## 通道

本模块没有数据通道。通用通道用法见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.screen.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.screen.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_6)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.screen.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.screen.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.screen.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.screen.faults()`，返回 `Faults`。

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

`status()` 返回 `Status`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `activity` | `Activity` | 当前活动：`Activity.Idle` / `Activity.Image` / `Activity.Video`，与屏幕快照的 `content` 对应 |

```python
st = robot.screen.status()
print(st.activity)   # Activity.Idle / Activity.Image / Activity.Video
```

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

面屏的显示资源同一时刻只服务一个写操作：`show_text` / `show_image` / `play_video` / `stop` / `set_battery` 共享同一显示资源，新命令排队执行；`get_status` 是只读查询，不参与排队。
