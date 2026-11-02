---
title: 头部 Head
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 头部 Head

## 模块概述

- 能力 id：`head`；槽位：`robot.head`
- 能力域：`motion`；能力版本：`1.1.0`
- 头部俯仰 / 偏航运动：关节目标、位姿运动、位姿伺服与全身控制下的头部约束模式。
- 关节顺序固定为 `[yaw, pitch]`，单位弧度。

所有运动 Operation 共用资源 `head`，策略 `queue`。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `get_joint` | `Empty` | `JointState` | 1000 ms |
| `get_pose` | `PoseQuery` | `Pose3d` | 1000 ms |
| `get_mode` | `Empty` | `Mode` | 1000 ms |
| `set_mode` | `Mode` | `Mode` | 1000 ms |
| `get_joint_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_joint_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `servo_pose` | `Pose3d` | `Pose3d` | 1000 ms |
| `get_arrival_thresholds` | `Empty` | `ArrivalThresholds` | 1000 ms |
| `set_arrival_thresholds` | `ArrivalThresholds` | `ArrivalThresholdsApplied` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

| 方法 | 请求 | 类型 | 资源 | 默认时限 |
|------|------|------|------|------|
| `move_joint` | `JointMove` | Operation | head | — |
| `move_joint_path` | `JointPath` | Operation | head | — |
| `move_pose` | `PoseMove` | Operation | head | — |

Operation 立即返回句柄，进度与结果通过快照获取；通用用法见 [命令与长时操作](../../usage/commands-operations.md)。

| 通道 | 内容 |
|------|------|
| `joint()` | `JointState` |
| `pose()` | `Pose3d` |

本页方法用到的枚举：

**`HeadMode` 枚举**

| 取值 | 说明 |
|------|------|
| `DISABLE` | 关闭全身控制下的头部任务，头部保持独立或静止 |
| `FORWARD` | 头部锁定朝向正前方 |
| `TRACKING` | 跟踪头部 6D 目标位姿 |
| `GAZE` | 注视点跟踪：`Pose3d` 的位置即空间注视点 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_joint

读取头部关节采样（`[yaw, pitch]`）。

```python
get_joint(*, timeout_ms: int = 1000) -> JointState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `JointState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `positions` | `list[float]` | 位置数组；点云按 X/Y/Z 依次展开 |
| `velocities` | `list[float]` | 关节速度数组 |
| `efforts` | `list[float]` | 关节力矩数组 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_pose

读取头部位姿。

```python
get_pose(*, frame_id: str = "", end_frame: str = "", timeout_ms: int = 1000) -> Pose3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Pose3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `z` | `float` | Z 坐标或分量，米 |
| `qx` | `float` | 四元数 x 分量 |
| `qy` | `float` | 四元数 y 分量 |
| `qz` | `float` | 四元数 z 分量 |
| `qw` | `float` | 四元数 w 分量 |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

### get_mode

读取当前模式。

```python
get_mode(*, timeout_ms: int = 1000) -> HeadMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `HeadMode`

`Mode` 在代理层被解包成 `HeadMode`。

**`HeadMode` 枚举**

| 取值 | 说明 |
|------|------|
| `DISABLE` | 关闭全身控制下的头部任务，头部保持独立或静止 |
| `FORWARD` | 头部锁定朝向正前方 |
| `TRACKING` | 跟踪头部 6D 目标位姿 |
| `GAZE` | 注视点跟踪：`Pose3d` 的位置即空间注视点 |

### set_mode

切换全身控制下的头部约束模式；`GAZE` 时位姿位置即空间注视点。

```python
set_mode(mode: HeadMode, *, timeout_ms: int = 1000) -> HeadMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `HeadMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `HeadMode`

`Mode` 在代理层被解包成 `HeadMode`。

### get_joint_velocity_limit

读取关节速度上限。

```python
get_joint_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_joint_velocity_limit

设置关节速度上限，返回生效值。

```python
set_joint_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 关节速度上限 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_joint_acceleration_limit

读取关节加速度上限。

```python
get_joint_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_joint_acceleration_limit

设置关节加速度上限，返回生效值。

```python
set_joint_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 关节加速度上限 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### servo_pose

下发一次位姿伺服目标，返回实际生效的位姿。属于短周期命令，不建立轨迹，适合高频外环控制。

```python
servo_pose(target: Pose3d | None = None, *, x: float = 0.0, y: float = 0.0, z: float = 0.0, qx: float = 0.0, qy: float = 0.0, qz: float = 0.0, qw: float = 1.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Pose3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `Pose3d | None` | `None` | 目标值 |
| `x` | `float` | `0.0` | X 分量，米 |
| `y` | `float` | `0.0` | Y 分量，米 |
| `z` | `float` | `0.0` | Z 分量，米 |
| `qx` | `float` | `0.0` | 四元数 x 分量 |
| `qy` | `float` | `0.0` | 四元数 y 分量 |
| `qz` | `float` | `0.0` | 四元数 z 分量 |
| `qw` | `float` | `1.0` | 四元数 w 分量 |
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `stamp_ns` | `int` | `0` | 目标时刻（纳秒）；0 表示最新 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Pose3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `z` | `float` | Z 坐标或分量，米 |
| `qx` | `float` | 四元数 x 分量 |
| `qy` | `float` | 四元数 y 分量 |
| `qz` | `float` | 四元数 z 分量 |
| `qw` | `float` | 四元数 w 分量 |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

### get_arrival_thresholds

读取该槽位的到位判定阈值。

```python
get_arrival_thresholds(*, timeout_ms: int = 1000) -> ArrivalThresholds
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholds`

| 字段 | 类型 | 说明 |
|------|------|------|
| `joint_tolerance` | `float` | 关节到位容差（弧度）；须为有限正数 |
| `max_timeout_s` | `float` | 在运动时长之上追加的到位等待上限（秒） |

### set_arrival_thresholds

整体替换该槽位的到位判定阈值；只改内存，不持久化，后续运动生效。

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | 关节到位容差（弧度） |
| `max_timeout_s` | `float` | `5.0` | 追加到位等待上限（秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholdsApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `applied` | `ArrivalThresholds` | 实际生效的配置 |

### move_joint

关节空间运动。`tolerance` 为到位容差，`duration` 为期望时长，`wait_timeout` 为额外到位等待；三者取 0 均表示沿用缺省。

```python
move_joint(target: JointPositions, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `JointPositions` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
from fabot.types import JointPositions

robot.head.move_joint(JointPositions(positions=[0.3, -0.2]), duration=1.5).wait(timeout=10.0)
```

### move_joint_path

沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。

```python
move_joint_path(waypoints: list[JointPositions], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[JointPositions]` | （必填） | 路点序列，至少两个 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointPathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose

末端位姿绝对运动。参考系取 `target.frame_id`，空串缺省槽位基准；`end_frame` 空串缺省当前 TCP 或法兰。

```python
move_pose(target: Pose3d, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `Pose3d` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joint()

头部关节状态流。

```python
joint(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `JointState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `positions` | `list[float]` | 位置数组；点云按 X/Y/Z 依次展开 |
| `velocities` | `list[float]` | 关节速度数组 |
| `efforts` | `list[float]` | 关节力矩数组 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### pose()

头部位姿流。

```python
pose(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Pose3d`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `z` | `float` | Z 坐标或分量，米 |
| `qx` | `float` | 四元数 x 分量 |
| `qy` | `float` | 四元数 y 分量 |
| `qz` | `float` | 四元数 z 分量 |
| `qw` | `float` | 四元数 w 分量 |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

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

`move_joint` / `move_joint_path` / `move_pose` 共用资源 `head`，策略 `queue`。
