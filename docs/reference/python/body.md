---
title: 躯干 Body
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 躯干 Body

## 模块概述

- 能力 id：`body`；槽位：`robot.body`
- 躯干关节运动与腰部升降/旋转控制。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `VelocityAppliedT` | Command |
| `set_waist_lift_velocity` | `velocity_scale` | `WaistLiftVelocityAppliedT` | Command |
| `set_waist_turn_velocity` | `velocity_scale` | `WaistTurnVelocityAppliedT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_waist` | `mode`, `x`, `z`, `phi`, `wait` | `MoveWaistOperation` | Operation |

Command 默认 `timeout_ms`：`get_joints` 为 1000，`get_velocity` / `set_velocity` 为 2000，`set_waist_lift_velocity` / `set_waist_turn_velocity` 为 1000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 关节位置流（`JointPositionsT`） |

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### get_joints

读取当前躯干关节角。

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`list[float]`：各关节角，单位弧度。

### get_velocity

读取当前关节运动的插值时长。

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：关节运动的插值时长，单位秒；值越大运动越慢。

### set_velocity

设置关节运动的插值时长，持久生效。

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
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | 实际生效的插值时长（秒） |

```python
applied = robot.body.set_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### set_waist_lift_velocity

按归一化比例驱动腰部升降；松手后发 0 停止。

```python
set_waist_lift_velocity(*, velocity_scale: float, timeout_ms: int = 1000) -> WaistLiftVelocityAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity_scale` | `float` | （必填） | 速度比例 `[-1, 1]`；正上升、负下降，`0` 停止 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`WaistLiftVelocityAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocityScale` | `float` | 实际生效的速度比例 |

```python
robot.body.set_waist_lift_velocity(velocity_scale=0.5)
# 到达目标高度后停止
robot.body.set_waist_lift_velocity(velocity_scale=0.0)
```

### set_waist_turn_velocity

按归一化比例驱动腰部旋转；松手后发 0 停止。

```python
set_waist_turn_velocity(*, velocity_scale: float, timeout_ms: int = 1000) -> WaistTurnVelocityAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity_scale` | `float` | （必填） | 速度比例 `[-1, 1]`；`0` 停止 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`WaistTurnVelocityAppliedT`：`outcome` / `appliedVelocityScale`，字段含义同 `set_waist_lift_velocity`。

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
positions = robot.body.get_joints()
positions[0] += 0.1
op = robot.body.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_waist

按腰部位姿执行长时运动，返回可轮询、可取消的 Operation。

```python
move_waist(*, mode: WaistMoveMode, x: float, z: float, phi: float, wait: bool) -> MoveWaistOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `WaistMoveMode` | （必填） | `ABSOLUTE`（绝对位姿）或 `RELATIVE`（相对增量） |
| `x` | `float` | （必填） | `ABSOLUTE`：`base_footprint` 下的 x；`RELATIVE`：dx。单位米 |
| `z` | `float` | （必填） | `ABSOLUTE`：`base_footprint` 下的 z；`RELATIVE`：dz。单位米 |
| `phi` | `float` | （必填） | `ABSOLUTE`：躯干朝向角；`RELATIVE`：dphi。单位弧度 |
| `wait` | `bool` | （必填） | `True` 时任务等到到位或超时再结束 |

纯升降用 `mode=RELATIVE` 且只填 `z`（`x=0, phi=0`）。

**返回**

`MoveWaistOperation`。快照字段与 `move_joints` 相同：`state` / `feedback: ProgressT` / `result: OutcomeT` / `error`，可 `cancel()`。

```python
from fabot.capabilities.body import WaistMoveMode

op = robot.body.move_waist(
    mode=WaistMoveMode.RELATIVE, x=0.0, z=0.05, phi=0.0, wait=True,
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joints()

订阅躯干关节位置流。

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
ch = robot.body.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## 事件

经 `robot.body.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.body.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.body.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.body.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.body.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.body.faults()`，返回 `Faults`。

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

`move_joints` / `move_waist` 共享同一躯干资源，新任务排队执行。
