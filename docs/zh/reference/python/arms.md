---
title: 双臂 Arms
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 双臂 Arms

## 模块概述

- 能力 id：`arms`；槽位：`robot.arms`
- 双臂协同运动与控制：双臂关节运动、双臂末端位姿 / 路径运动、插值时长设置、阻抗拖拽、双臂抱闸与相对位姿保持。
- 笛卡尔空间的双臂运动只经本模块的 `move_dual_arm_*` 下发，不要与 `robot.left_arm` / `robot.right_arm` 的单臂 `move_pose` 并行使用。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_pose` | — | `DualArmPoseMoveT` | Command |
| `get_joints_velocity` | — | `float` | Command |
| `set_joints_velocity` | `velocity` | `JointsVelocityAppliedT` | Command |
| `get_poses_velocity` | — | `float` | Command |
| `set_poses_velocity` | `velocity` | `PosesVelocityAppliedT` | Command |
| `get_drag` | — | `DragStateT` | Command |
| `set_drag` | `open`, `mode` | `OutcomeT` | Command |
| `get_brake` | — | `BrakeStateT` | Command |
| `set_brake` | `left_open`, `right_open` | `OutcomeT` | Command |
| `set_relative_pose_hold` | `enabled` | `OutcomeT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_dual_arm_pose` | `poses`, `wait`, `frame_id` | `MoveDualArmPoseOperation` | Operation |
| `move_dual_arm_path` | `poses`, `wait`, `frame_id` | `MoveDualArmPathOperation` | Operation |

Command 默认 `timeout_ms`：`get_joints` / `get_pose` 为 1000，插值时长与拖拽查询、`set_relative_pose_hold` 为 2000，`set_drag` 为 5000，`get_brake` / `set_brake` 为 10000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 双臂关节位置流（`JointPositionsT`） |
| `pose()` | 双臂末端位姿流（`DualArmPoseMoveT`） |

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### get_joints

读取双臂当前关节角。

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`list[float]`：左臂关节角 + 右臂关节角依次拼接（常见为 14 个），单位弧度。

### get_pose

读取双臂当前末端位姿。

```python
get_pose(*, timeout_ms: int = 1000) -> DualArmPoseMoveT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`DualArmPoseMoveT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `poses` | `list[Pose3dT]` | 左右臂末端位姿（依次为左臂、右臂；`x` / `y` / `z` 单位米，`qx` / `qy` / `qz` / `qw` 为姿态四元数） |
| `wait` | `bool` | 保留字段 |
| `frameId` | `str` | 位姿参考坐标系 |

### get_joints_velocity

读取关节运动（MoveJ）插值时长。

```python
get_joints_velocity(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：当前 MoveJ 插值时长，单位秒。

### set_joints_velocity

设置关节运动（MoveJ）插值时长，持久生效。

```python
set_joints_velocity(*, velocity: float, timeout_ms: int = 2000) -> JointsVelocityAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity` | `float` | （必填） | MoveJ 插值时长，单位秒 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`JointsVelocityAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | 实际生效的插值时长（秒） |

```python
applied = robot.arms.set_joints_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### get_poses_velocity

读取末端位姿运动（MoveL）插值时长。

```python
get_poses_velocity(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`float`：当前 MoveL 插值时长，单位秒。

### set_poses_velocity

设置末端位姿运动（MoveL）插值时长，持久生效。

```python
set_poses_velocity(*, velocity: float, timeout_ms: int = 2000) -> PosesVelocityAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `velocity` | `float` | （必填） | MoveL 插值时长，单位秒 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`PosesVelocityAppliedT`：`outcome`（`OutcomeT` \| `None`）/ `appliedVelocity`（`float`，实际生效值，秒）。

### get_drag

查询阻抗拖拽状态。

```python
get_drag(*, timeout_ms: int = 2000) -> DragStateT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`DragStateT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `open` | `bool` | 拖拽是否打开 |
| `mode` | `DragMode` | 拖拽模式：`LOW_IMPEDANCE`（低阻抗）或 `HIGH_IMPEDANCE`（高阻抗） |

### set_drag

打开或关闭阻抗拖拽。

```python
set_drag(*, open: bool, mode: DragMode, timeout_ms: int = 5000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `open` | `bool` | （必填） | `True` 打开拖拽，`False` 关闭 |
| `mode` | `DragMode` | （必填） | `LOW_IMPEDANCE` 或 `HIGH_IMPEDANCE` |
| `timeout_ms` | `int` | `5000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
from fabot.capabilities.arms import DragMode

outcome = robot.arms.set_drag(open=True, mode=DragMode.LOW_IMPEDANCE)
print(outcome.success, outcome.statusMessage)
```

### get_brake

查询双臂抱闸状态。

```python
get_brake(*, timeout_ms: int = 10000) -> BrakeStateT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`BrakeStateT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `leftOpen` | `bool` | 左臂抱闸是否打开（松闸） |
| `rightOpen` | `bool` | 右臂抱闸是否打开（松闸） |

### set_brake

分别打开或闭合左右臂抱闸。

```python
set_brake(*, left_open: bool, right_open: bool, timeout_ms: int = 10000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `left_open` | `bool` | （必填） | `True` 左臂松闸，`False` 合闸 |
| `right_open` | `bool` | （必填） | `True` 右臂松闸，`False` 合闸 |
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
outcome = robot.arms.set_brake(left_open=True, right_open=True)
print(outcome.success, outcome.statusMessage)
```

### set_relative_pose_hold

开关双臂末端相对位姿保持：打开后两臂末端相对位姿固定，随整机一起运动。

```python
set_relative_pose_hold(*, enabled: bool, timeout_ms: int = 2000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | `True` 保持相对位姿，`False` 取消 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

### move_joints

按关节角执行双臂长时运动，返回可轮询、可取消的 Operation。

```python
move_joints(*, positions: list[float], wait: bool) -> MoveJointsOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `positions` | `list[float]` | （必填） | 目标关节角，左臂 + 右臂依次拼接（常见 14 个），单位弧度 |
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
positions = robot.arms.get_joints()
positions[1] += 0.2
op = robot.arms.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_dual_arm_pose

双臂末端同时平滑运动到指定位姿，返回可轮询、可取消的 Operation。

```python
move_dual_arm_pose(*, poses: list[Pose3dT], wait: bool, frame_id: str) -> MoveDualArmPoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `poses` | `list[Pose3dT]` | （必填） | 长度必须为 2：依次为左臂、右臂目标位姿 |
| `wait` | `bool` | （必填） | `True` 时任务等到到位或超时再结束 |
| `frame_id` | `str` | （必填） | 位姿参考坐标系：`arm_base` / `base_footprint` / `body_link4`；空串等价 `arm_base` |

**返回**

`MoveDualArmPoseOperation`。快照字段与 `move_joints` 相同：`state` / `feedback: ProgressT` / `result: OutcomeT` / `error`，可 `cancel()`。

```python
from fabot.types.Pose3d import Pose3dT

left = Pose3dT()
left.x, left.y, left.z = 0.3, 0.2, 0.4
left.qw = 1.0
right = Pose3dT()
right.x, right.y, right.z = 0.3, -0.2, 0.4
right.qw = 1.0
op = robot.arms.move_dual_arm_pose(poses=[left, right], wait=True, frame_id="arm_base")
```

### move_dual_arm_path

双臂末端沿多中间点平滑轨迹运动，返回可轮询、可取消的 Operation。

```python
move_dual_arm_path(*, poses: list[Pose3dT], wait: bool, frame_id: str) -> MoveDualArmPathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `poses` | `list[Pose3dT]` | （必填） | 长度须为偶数：前半为左臂轨迹，后半为右臂轨迹 |
| `wait` | `bool` | （必填） | `True` 时任务等到到位或超时再结束 |
| `frame_id` | `str` | （必填） | 位姿参考坐标系：`arm_base` / `base_footprint` / `body_link4`；空串等价 `arm_base` |

**返回**

`MoveDualArmPathOperation`。快照字段与 `move_joints` 相同：`state` / `feedback: ProgressT` / `result: OutcomeT` / `error`，可 `cancel()`。

```python
op = robot.arms.move_dual_arm_path(
    poses=[left_p1, left_p2, right_p1, right_p2], wait=True, frame_id="arm_base",
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joints()

订阅双臂关节位置流。

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
| `payload` | `JointPositionsT` | `payload.positions`：`list[float]`，左臂 + 右臂依次拼接，单位弧度 |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.arms.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

### pose()

订阅双臂末端位姿流。

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
| `payload` | `DualArmPoseMoveT` | `payload.poses`：`list[Pose3dT]`，依次为左臂、右臂末端位姿；`payload.frameId`：参考坐标系 |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.arms.pose(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    left, right = frame.payload.poses
    print(left.x, left.y, left.z, right.x, right.y, right.z)
```

## 事件

经 `robot.arms.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.arms.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.arms.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.arms.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.arms.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.arms.faults()`，返回 `Faults`。

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

`move_joints` / `move_dual_arm_pose` / `move_dual_arm_path` 共享同一资源，新任务排队执行。
