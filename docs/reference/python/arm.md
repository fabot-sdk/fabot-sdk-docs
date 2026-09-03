---
title: 机械臂 Arm
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 机械臂 Arm

## 模块概述

- 能力 id：`arm`；槽位：`robot.left_arm` / `robot.right_arm`
- 单臂关节运动与末端位姿控制。左右臂是同一套 API、各自独立的槽位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_pose` | — | `Pose3dT` | Command |
| `get_brake` | — | `bool` | Command |
| `set_brake` | `open` | `OutcomeT` | Command |
| `set_enabled` | `enabled` | `OutcomeT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_pose` | `pose`, `mode`, `wait`, `frame_id` | `MovePoseOperation` | Operation |

Command 默认 `timeout_ms`：`get_joints` / `get_pose` 为 1000，`set_enabled` 为 3000，`get_brake` / `set_brake` 为 10000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 关节位置流（`JointPositionsT`） |
| `pose()` | 末端位姿流（`Pose3dT`） |

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

### get_pose

读取当前末端位姿。

```python
get_pose(*, timeout_ms: int = 1000) -> Pose3dT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`Pose3dT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` / `y` / `z` | `float` | 位置，单位米 |
| `qx` / `qy` / `qz` / `qw` | `float` | 姿态四元数 |

### get_brake

查询抱闸是否打开。

```python
get_brake(*, timeout_ms: int = 10000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`bool`：`True` 表示抱闸打开（松闸），`False` 表示抱闸闭合。

### set_brake

打开或闭合抱闸。

```python
set_brake(*, open: bool, timeout_ms: int = 10000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `open` | `bool` | （必填） | `True` 松闸，`False` 合闸 |
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | 是否成功 |
| `statusMessage` | `str` | 状态说明 |

```python
outcome = robot.left_arm.set_brake(open=True)
print(outcome.success, outcome.statusMessage)
```

### set_enabled

使能或失能该臂。

```python
set_enabled(*, enabled: bool, timeout_ms: int = 3000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | `True` 使能，`False` 失能 |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
outcome = robot.left_arm.set_enabled(enabled=True)
print(outcome.success, outcome.statusMessage)
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
positions = robot.left_arm.get_joints()
positions[1] += 0.2
op = robot.left_arm.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_pose

按末端位姿执行长时运动，返回可轮询、可取消的 Operation。

```python
move_pose(*, pose: Pose3dT, mode: PoseMoveMode, wait: bool, frame_id: str) -> MovePoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pose` | `Pose3dT` | （必填） | 目标末端位姿：`x` / `y` / `z`（米），`qx` / `qy` / `qz` / `qw` |
| `mode` | `PoseMoveMode` | （必填） | `SMOOTH`（平滑）或 `DIRECT`（直接） |
| `wait` | `bool` | （必填） | `True` 时任务等到到位或超时再结束 |
| `frame_id` | `str` | （必填） | 位姿参考坐标系；空串等价 `arm_base` |

**返回**

`MovePoseOperation`。快照字段与 `move_joints` 相同：`state` / `feedback: ProgressT` / `result: OutcomeT` / `error`，可 `cancel()`。

```python
from fabot.capabilities.arm import PoseMoveMode
from fabot.types.Pose3d import Pose3dT

pose = Pose3dT()
pose.x, pose.y, pose.z = 0.3, 0.0, 0.4
pose.qw = 1.0
op = robot.right_arm.move_pose(
    pose=pose, mode=PoseMoveMode.SMOOTH, wait=True, frame_id="arm_base",
)
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
ch = robot.left_arm.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

### pose()

订阅末端位姿流。

```python
pose(qos_profile: str = "latest") -> PoseChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`PoseChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `Pose3dT` | `x` / `y` / `z`（米），`qx` / `qy` / `qz` / `qw` |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.right_arm.pose(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.x, frame.payload.y, frame.payload.z)
```

## 事件

经 `robot.left_arm.events` / `robot.right_arm.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.left_arm.events.fault_changed.subscribe(callback)`（右臂同理）。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.left_arm.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.left_arm.events.lifecycle_changed.subscribe(callback)`（右臂同理）。

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

token = robot.right_arm.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.left_arm.faults()` / `robot.right_arm.faults()`，返回 `Faults`。

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

同一只手臂上的 `move_joints` / `move_pose` 共享同一资源，新任务排队执行。
