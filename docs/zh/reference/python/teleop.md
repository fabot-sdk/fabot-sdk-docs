---
title: 遥操作 Teleop
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 遥操作 Teleop

## 模块概述

- 能力 id：`teleop`；槽位：`robot.teleop`
- 能力域：`motion`；能力版本：`1.1.0`
- 手柄遥操作会话的建立与停止。整机只有一个遥操作槽位。
- 会话本身是一个长时 Operation：取消它等价于结束会话。

控制资源 `joystick_control` 策略为 `reject`：会话进行中再次发起会被立即拒绝，不排队，须先 `stop_joystick_control()` 或等会话结束。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `stop_joystick_control` | Command | 停止当前会话；默认超时 10000 ms。 |
| `start_joystick_control` | Operation | 建立手柄遥操作会话，返回可轮询、可取消的 Operation；默认时限 45 秒。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### stop_joystick_control

停止当前会话。

```python
stop_joystick_control(*, timeout_ms: int = 10000) -> Outcome
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | 调用超时（毫秒） |

**返回** `Outcome`

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | 是否成功 |
| `status_message` | `str` | 状态说明文本 |

### start_joystick_control

建立手柄遥操作会话，返回可轮询、可取消的 Operation。会话有 45 秒默认时限，到时自动进入终态。

```python
start_joystick_control() -> StartJoystickControlOperation
```

返回 `StartJoystickControlOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
robot.teleop.start_joystick_control()
# ... 手柄操作 ...
robot.teleop.stop_joystick_control()
```

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

遥操作控制是独占资源，策略 `reject`：同一时刻只允许一个会话，进行中再次发起会被直接拒绝。
