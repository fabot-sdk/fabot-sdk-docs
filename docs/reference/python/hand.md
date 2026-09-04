---
title: 灵巧手 Hand
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 灵巧手 Hand

## 模块概述

- 能力 id：`hand`；槽位：`robot.left_hand` / `robot.right_hand`
- 单手多指关节开合度控制，含速度与力矩设置。左右手是同一套 API、各自独立的槽位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `ToolSpeedAppliedT` | Command |
| `get_torque` | — | `float` | Command |
| `set_torque` | `torque` | `TorqueAppliedT` | Command |
| `move_joints` | `positions`, `duration_s`, `position_threshold` | `MoveJointsOperation` | Operation |

Command 默认 `timeout_ms`：`get_joints` 为 1000，`get_velocity` / `set_velocity` / `get_torque` / `set_torque` 为 2000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 关节开合度流（`JointPositionsT`） |

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

关节开合度建议归一化到 0~1：0 表示弯曲/收拢，1 表示伸直/张开；列表长度依手部构型而定。

### get_joints

读取当前各关节开合度。

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`list[float]`：各关节开合度，建议归一化 0~1。

```python
positions = robot.left_hand.get_joints()
print(positions)
```

### get_velocity

读取当前持久速度标量。

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：当前速度标量。

### set_velocity

设置持久速度标量，影响后续 `move_joints`。

```python
set_velocity(*, velocity: float, timeout_ms: int = 2000) -> ToolSpeedAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity` | `float` | （必填） | 无符号速度标量，须为正有限值 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`ToolSpeedAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | 实际生效的速度标量 |

```python
applied = robot.left_hand.set_velocity(velocity=0.5)
print(applied.outcome.success, applied.appliedVelocity)
```

### get_torque

读取当前持久力矩标量。

```python
get_torque(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：当前力矩标量。

### set_torque

设置持久力矩标量，影响后续 `move_joints`。

```python
set_torque(*, torque: float, timeout_ms: int = 2000) -> TorqueAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `torque` | `float` | （必填） | 无符号力矩标量，须为非负有限值 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`TorqueAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedTorque` | `float` | 实际生效的力矩标量 |

```python
applied = robot.left_hand.set_torque(torque=0.3)
print(applied.outcome.success, applied.appliedTorque)
```

### move_joints

按目标开合度执行长时运动，返回可轮询、可取消的 Operation。速度与力矩不在此方法携带，须先经 `set_velocity` / `set_torque` 设置。

```python
move_joints(*, positions: list[float], duration_s: float, position_threshold: float) -> MoveJointsOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `positions` | `list[float]` | （必填） | 目标开合度，建议归一化 0~1 |
| `duration_s` | `float` | （必填） | 当次到位超时（秒）；`0` 使用系统默认值，仅约束等待时长 |
| `position_threshold` | `float` | （必填） | 当次到位阈值，与 `positions` 同单位；`0` 使用系统默认值 |

**返回**

`MoveJointsOperation`。通过 `get()` / `events()` 取快照，也可 `cancel()`。快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `feedback` | `ProgressT` \| `None` | `progress`（`float`）、`statusMessage`（`str`） |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | 失败原因 |

```python
robot.left_hand.set_velocity(velocity=0.5)
op = robot.left_hand.move_joints(
    positions=[0.0, 0.0, 0.0, 0.0, 0.0], duration_s=5.0, position_threshold=0.02,
)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joints()

订阅关节开合度流。

```python
joints(qos_profile: str = "latest") -> JointsChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`JointsChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `JointPositionsT` | `payload.positions`：`list[float]`，各关节开合度 |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.right_hand.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## 事件

经 `robot.left_hand.events` / `robot.right_hand.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.left_hand.events.fault_changed.subscribe(callback)`（右手同理）。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.left_hand.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.left_hand.events.lifecycle_changed.subscribe(callback)`（右手同理）。

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

token = robot.right_hand.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.left_hand.faults()` / `robot.right_hand.faults()`，返回 `Faults`。

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

同一只手上的 `move_joints` 独占该手资源，新任务排队执行。
