---
title: 头部 Head
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 头部 Head

## 模块概述

- 能力 id：`head`；槽位：`robot.head`
- 头部俯仰 / 偏航运动控制。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `VelocityAppliedT` | Command |
| `check_arrive` | `threshold`, `target_joints` | `bool` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |

Command 默认 `timeout_ms`：`get_joints` / `check_arrive` 为 1000，`get_velocity` / `set_velocity` 为 2000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 关节位置流（`JointPositionsT`） |

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### get_joints

读取当前关节角。

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`list[float]`：各关节角，单位弧度。

```python
positions = robot.head.get_joints()
print(positions)
```

### get_velocity

读取当前的插值时长设置。

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：持久生效的 MoveJ 插值时长，单位秒；值越大运动越慢。

```python
print(robot.head.get_velocity())
```

### set_velocity

设置插值时长，对所有后续运动持久生效。

```python
set_velocity(*, velocity: float, timeout_ms: int = 2000) -> VelocityAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity` | `float` | （必填） | 插值时长，单位秒；须为正有限值，越大运动越慢 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`VelocityAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | 实际生效的插值时长（秒） |

```python
applied = robot.head.set_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### check_arrive

检查头部是否到达目标关节角。

```python
check_arrive(*, threshold: float, target_joints: list[float], timeout_ms: int = 1000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `threshold` | `float` | （必填） | 关节空间 L2 容差，单位弧度 |
| `target_joints` | `list[float]` | （必填） | 目标关节角（弧度）；传空列表时使用最近一次 `move_joints` 下发的目标 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`bool`：`True` 表示已到位。

```python
arrived = robot.head.check_arrive(threshold=0.05, target_joints=[])
print(arrived)
```

### move_joints

按关节角执行长时运动，返回可轮询、可取消的 Operation。

```python
move_joints(*, positions: list[float], wait: bool) -> MoveJointsOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `positions` | `list[float]` | （必填） | 目标关节角，单位弧度 |
| `wait` | `bool` | （必填） | `True` 时任务等到到位或超时再结束 |

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
positions = robot.head.get_joints()
positions[0] += 0.2
op = robot.head.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joints()

订阅关节位置流。

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
| `payload` | `JointPositionsT` | `payload.positions`：`list[float]`，单位弧度 |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.head.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## 事件

经 `robot.head.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.head.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.head.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.head.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.head.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.head.faults()`，返回 `Faults`。

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

`move_joints` 占用头部运动资源；同一槽位上的新任务排队执行。
