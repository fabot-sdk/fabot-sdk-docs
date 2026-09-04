---
title: 遥操作 Teleop
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 遥操作 Teleop

## 模块概述

- 能力 id：`teleop`；槽位：`robot.teleop`
- 远程遥操作（手柄）控制会话的建立与停止。整机只有一个遥操作槽位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `start_joystick_control` | — | `StartJoystickControlOperation` | Operation |
| `stop_joystick_control` | — | `OutcomeT` | Command |

Command 默认 `timeout_ms`：`stop_joystick_control` 为 10000（可覆盖）。参数均为关键字参数。

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### start_joystick_control

建立手柄遥操作会话，返回可轮询、可取消的 Operation。会话进行中持续接收远端控制数据；取消 Operation 等价于结束会话。

```python
start_joystick_control() -> StartJoystickControlOperation
```

**参数**

无参数。

**返回**

`StartJoystickControlOperation`。通过 `get()` / `events()` 取快照，也可 `cancel()`。会话有默认时限，到时任务自动进入终态。快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `feedback` | `ProgressT` \| `None` | `progress`（`float`）、`statusMessage`（`str`） |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | 失败原因 |

```python
op = robot.teleop.start_joystick_control()
for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### stop_joystick_control

停止当前手柄遥操作会话。

```python
stop_joystick_control(*, timeout_ms: int = 10000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | 是否成功 |
| `statusMessage` | `str` | 状态说明 |

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.statusMessage)
```

## 通道

本模块没有数据通道。遥操作会话的建立与结束通过上述方法完成，会话进度与结果通过 Operation 快照获取；通用通道用法见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.teleop.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.teleop.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.teleop.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.teleop.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.teleop.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.teleop.faults()`，返回 `Faults`。

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

本模块没有 `status()`；整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

遥操作控制是独占资源：同一时刻只允许一个手柄遥操作会话。会话进行中再次调用 `start_joystick_control` 会被直接拒绝（不排队），须先 `stop_joystick_control` 或等会话结束再发起。
