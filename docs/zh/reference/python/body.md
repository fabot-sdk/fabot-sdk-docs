---
title: 躯干 Body
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 躯干 Body

## 模块概述

- 能力 id：`body`；槽位：`robot.body`
- 能力域：`motion`；能力版本：`1.1.0`
- 躯干（腰部）运动：4 自由度关节目标、简并平面位姿、腰部速度伺服与全身控制下的躯干约束模式。
- `WaistPose` 用 `x`（前探）/ `z`（升降）/ `phi`（俯仰）描述腰部，`WaistTwist` 是等价的归一化速度比例。

所有运动 Operation 共用资源 `body`，策略 `queue`，默认时限 60 秒。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_joint` | Command | 读取躯干关节采样；默认超时 1000 ms。 |
| `get_pose` | Command | 读取躯干位姿；默认超时 1000 ms。 |
| `get_mode` | Command | 读取当前模式；默认超时 1000 ms。 |
| `set_mode` | Command | 切换全身控制下的躯干约束模式；默认超时 1000 ms。 |
| `get_joint_velocity_limit` | Command | 读取关节速度上限；默认超时 1000 ms。 |
| `set_joint_velocity_limit` | Command | 设置关节速度上限，返回生效值；默认超时 1000 ms。 |
| `get_linear_velocity_limit` | Command | 读取线速度上限；默认超时 1000 ms。 |
| `set_linear_velocity_limit` | Command | 设置线速度上限，返回生效值；默认超时 1000 ms。 |
| `get_angular_velocity_limit` | Command | 读取角速度上限；默认超时 1000 ms。 |
| `set_angular_velocity_limit` | Command | 设置角速度上限，返回生效值；默认超时 1000 ms。 |
| `get_joint_acceleration_limit` | Command | 读取关节加速度上限；默认超时 1000 ms。 |
| `set_joint_acceleration_limit` | Command | 设置关节加速度上限，返回生效值；默认超时 1000 ms。 |
| `get_linear_acceleration_limit` | Command | 读取线加速度上限；默认超时 1000 ms。 |
| `set_linear_acceleration_limit` | Command | 设置线加速度上限，返回生效值；默认超时 1000 ms。 |
| `get_angular_acceleration_limit` | Command | 读取角加速度上限；默认超时 1000 ms。 |
| `set_angular_acceleration_limit` | Command | 设置角加速度上限，返回生效值；默认超时 1000 ms。 |
| `servo_waist_twist` | Command | 腰部速度伺服：`lift` / `turn` / `pitch` 均为归一化速度比例，取值 [-1, 1]；默认超时 1000 ms。 |
| `servo_pose` | Command | 下发一次位姿伺服目标，返回实际生效的位姿；默认超时 1000 ms。 |
| `get_arrival_thresholds` | Command | 读取该槽位的到位判定阈值；默认超时 1000 ms。 |
| `set_arrival_thresholds` | Command | 整体替换该槽位的到位判定阈值；只改内存，不持久化，后续运动生效；默认超时 1000 ms。 |
| `move_joint` | Operation | 关节空间运动；默认时限 60 秒。 |
| `move_joint_path` | Operation | 沿关节路点序列运动；至少两个路点，当前关节接到第一个路点；默认时限 60 秒。 |
| `move_waist` | Operation | 腰部简并平面位姿的绝对运动（`x` 前探、`z` 升降、`phi` 俯仰）；默认时限 60 秒。 |
| `move_waist_relative` | Operation | 腰部简并平面位姿的增量运动；默认时限 60 秒。 |
| `move_pose` | Operation | 末端位姿绝对运动；默认时限 60 秒。 |
| `move_pose_relative` | Operation | 末端位姿增量运动；默认时限 60 秒。 |
| `joint` | Channel | 躯干关节状态流，帧为 `JointState`。 |
| `pose` | Channel | 躯干位姿流，帧为 `Pose3d`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

本页方法用到的枚举：

**`BodyMode` 枚举**

| 取值 | 说明 |
|------|------|
| `FREE` | 躯干作为冗余自由度随双臂任务自由运动 |
| `RELATIVE` | 保持躯干竖直 / 相对姿态约束 |
| `TRACKING` | 显式跟踪躯干 6D 位姿目标 |
| `LOCK` | 锁定当前躯干关节与位姿 |
| `HEAD_COUPLED` | 躯干与头部协同耦合运动 |
| `CUSTOM_LOCK` | 按自定义轴掩码锁定躯干自由度 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_joint

读取躯干关节采样。

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

读取躯干位姿。

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
get_mode(*, timeout_ms: int = 1000) -> BodyMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `BodyMode`

`Mode` 在代理层被解包成 `BodyMode`。

**`BodyMode` 枚举**

| 取值 | 说明 |
|------|------|
| `FREE` | 躯干作为冗余自由度随双臂任务自由运动 |
| `RELATIVE` | 保持躯干竖直 / 相对姿态约束 |
| `TRACKING` | 显式跟踪躯干 6D 位姿目标 |
| `LOCK` | 锁定当前躯干关节与位姿 |
| `HEAD_COUPLED` | 躯干与头部协同耦合运动 |
| `CUSTOM_LOCK` | 按自定义轴掩码锁定躯干自由度 |

### set_mode

切换全身控制下的躯干约束模式。

```python
set_mode(mode: BodyMode, *, timeout_ms: int = 1000) -> BodyMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `BodyMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `BodyMode`

`Mode` 在代理层被解包成 `BodyMode`。

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

### get_linear_velocity_limit

读取线速度上限。

```python
get_linear_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_velocity_limit

设置线速度上限，返回生效值。

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线速度上限，米/秒 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_velocity_limit

读取角速度上限。

```python
get_angular_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_velocity_limit

设置角速度上限，返回生效值。

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角速度上限，弧度/秒 |
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

### get_linear_acceleration_limit

读取线加速度上限。

```python
get_linear_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_acceleration_limit

设置线加速度上限，返回生效值。

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线加速度上限，米/秒² |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_acceleration_limit

读取角加速度上限。

```python
get_angular_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_acceleration_limit

设置角加速度上限，返回生效值。

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角加速度上限，弧度/秒² |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### servo_waist_twist

腰部速度伺服：`lift` / `turn` / `pitch` 均为归一化速度比例，取值 [-1, 1]。

```python
servo_waist_twist(*, lift: float, turn: float, pitch: float, timeout_ms: int = 1000) -> WaistTwist
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `lift` | `float` | （必填） | 升降速度比例，取值 [-1, 1] |
| `turn` | `float` | （必填） | 水平旋转速度比例，取值 [-1, 1] |
| `pitch` | `float` | （必填） | 俯仰速度比例，取值 [-1, 1] |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `WaistTwist`

| 字段 | 类型 | 说明 |
|------|------|------|
| `lift` | `float` | 竖直升降速度比例，正值向上，负值向下。 |
| `turn` | `float` | 腰部水平旋转速度比例，正值左旋，负值右旋。 |
| `pitch` | `float` | 腰部俯仰速度比例，正值前倾，负值后仰。 |

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
set_arrival_thresholds(*, joint_tolerance: float = 0.02, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholds
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | 关节到位容差（弧度） |
| `max_timeout_s` | `float` | `5.0` | 追加到位等待上限（秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholds`

| 字段 | 类型 | 说明 |
|------|------|------|
| `joint_tolerance` | `float` | 关节到位容差（弧度）；须为有限正数 |
| `max_timeout_s` | `float` | 在运动时长之上追加的到位等待上限（秒） |

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

### move_waist

腰部简并平面位姿的绝对运动（`x` 前探、`z` 升降、`phi` 俯仰）。

```python
move_waist(target: WaistPose, *, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveWaistOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `WaistPose` | （必填） | 目标值 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveWaistOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
from fabot.capabilities.body import WaistPose

op = robot.body.move_waist(WaistPose(x=0.05, z=0.10, phi=0.0), duration=3.0)
op.wait(timeout=15.0)
print(robot.body.get_pose().z)
```

### move_waist_relative

腰部简并平面位姿的增量运动。

```python
move_waist_relative(target: WaistPose, *, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveWaistRelativeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `WaistPose` | （必填） | 目标值 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveWaistRelativeOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

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

### move_pose_relative

末端位姿增量运动。`target` 表示相对当前位姿的增量。

```python
move_pose_relative(target: Pose3d, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseRelativeOperation
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

返回 `MovePoseRelativeOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joint()

躯干关节状态流。

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

躯干位姿流。

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

`move_joint` / `move_joint_path` / `move_waist` / `move_waist_relative` / `move_pose` 共用资源 `body`，策略 `queue`，默认时限 60 秒。
