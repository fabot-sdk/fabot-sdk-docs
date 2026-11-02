---
title: 双臂 Arms
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 双臂 Arms

## 模块概述

- 能力 id：`arms`；槽位：`robot.arms`
- 能力域：`motion`；能力版本：`1.1.0`
- 双臂协同运动：耦合模式、导纳拖拽、双臂相对位姿与同步轨迹。左右臂数据在同一次调用里成对给出。
- `ArmsMode.COUPLED` 会保持开启耦合时刻的相对末端位姿；`ImpedanceMode` 用于导纳拖拽示教。

所有运动 Operation 共用资源 `arms`，策略 `queue`。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_joint` | Command | 读取双臂关节采样，`left` / `right` 共用同一时间戳；默认超时 1000 ms。 |
| `get_pose` | Command | 读取双臂末端位姿；默认超时 1000 ms。 |
| `get_mode` | Command | 读取当前模式；默认超时 1000 ms。 |
| `set_mode` | Command | 切换双臂耦合模式，返回生效模式；默认超时 2000 ms。 |
| `get_impedance` | Command | 读取导纳拖拽模式；默认超时 2000 ms。 |
| `set_impedance` | Command | 切换导纳拖拽模式；`DISABLED` 恢复刚性位置控制；默认超时 5000 ms。 |
| `get_brake` | Command | 查询抱闸状态；默认超时 10000 ms。 |
| `set_brake` | Command | 同时松开或闭合双臂抱闸，返回两侧状态；默认超时 10000 ms。 |
| `get_joint_velocity_limit` | Command | 读取关节速度上限；默认超时 2000 ms。 |
| `set_joint_velocity_limit` | Command | 设置关节速度上限，返回生效值；默认超时 2000 ms。 |
| `get_linear_velocity_limit` | Command | 读取线速度上限；默认超时 2000 ms。 |
| `set_linear_velocity_limit` | Command | 设置线速度上限，返回生效值；默认超时 2000 ms。 |
| `get_angular_velocity_limit` | Command | 读取角速度上限；默认超时 2000 ms。 |
| `set_angular_velocity_limit` | Command | 设置角速度上限，返回生效值；默认超时 2000 ms。 |
| `get_joint_acceleration_limit` | Command | 读取关节加速度上限；默认超时 2000 ms。 |
| `set_joint_acceleration_limit` | Command | 设置关节加速度上限，返回生效值；默认超时 2000 ms。 |
| `get_linear_acceleration_limit` | Command | 读取线加速度上限；默认超时 2000 ms。 |
| `set_linear_acceleration_limit` | Command | 设置线加速度上限，返回生效值；默认超时 2000 ms。 |
| `get_angular_acceleration_limit` | Command | 读取角加速度上限；默认超时 2000 ms。 |
| `set_angular_acceleration_limit` | Command | 设置角加速度上限，返回生效值；默认超时 2000 ms。 |
| `servo_pose` | Command | 双臂位姿伺服，返回实际生效位姿；默认超时 1000 ms。 |
| `get_arrival_thresholds` | Command | 读取该槽位的到位判定阈值；默认超时 1000 ms。 |
| `set_arrival_thresholds` | Command | 整体替换该槽位的到位判定阈值；只改内存，不持久化，后续运动生效；默认超时 1000 ms。 |
| `move_joint` | Operation | 关节空间运动。 |
| `move_joint_path` | Operation | 沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。 |
| `move_pose` | Operation | 末端位姿绝对运动。 |
| `move_pose_relative` | Operation | 末端位姿增量运动。 |
| `move_pose_path` | Operation | 沿末端位姿路点序列运动，每个路点自带 `frame_id`。 |
| `move_pose_arc_by_points` | Operation | 三点圆弧运动：起点为当前位姿，经 `via` 到 `end`。 |
| `move_pose_arc_by_center` | Operation | 圆心圆弧运动：圆心由 `center.frame_id` 定位。 |
| `joint` | Channel | 双臂关节状态流，帧为 `DualJointState`。 |
| `pose` | Channel | 双臂末端位姿流，帧为 `DualPose`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

本页方法用到的枚举：

**`ArmsMode` 枚举**

| 取值 | 说明 |
|------|------|
| `INDEPENDENT` | 双臂独立运动 |
| `COUPLED` | 保持开启耦合时的相对末端位姿 |

**`ImpedanceMode` 枚举**

| 取值 | 说明 |
|------|------|
| `DISABLED` | 关闭导纳拖拽，回到刚性位置控制 |
| `LOW` | 低刚度导纳 |
| `HIGH` | 高刚度导纳 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_joint

读取双臂关节采样，`left` / `right` 共用同一时间戳。

```python
get_joint(*, timeout_ms: int = 1000) -> DualJointState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `DualJointState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left` | `JointState` | 左 |
| `right` | `JointState` | 右 |

```python
state = robot.arms.get_joint()
print(state.left.positions, state.right.positions)
```

### get_pose

读取双臂末端位姿。

```python
get_pose(*, frame_id: str = "", end_frame: str = "", timeout_ms: int = 1000) -> DualPose
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `DualPose`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left` | `Pose3d` | 左 |
| `right` | `Pose3d` | 右 |

### get_mode

读取当前模式。

```python
get_mode(*, timeout_ms: int = 1000) -> ArmsMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArmsMode`

`Mode` 在代理层被解包成 `ArmsMode`。

**`ArmsMode` 枚举**

| 取值 | 说明 |
|------|------|
| `INDEPENDENT` | 双臂独立运动 |
| `COUPLED` | 保持开启耦合时的相对末端位姿 |

### set_mode

切换双臂耦合模式，返回生效模式。

```python
set_mode(mode: ArmsMode, *, timeout_ms: int = 2000) -> ArmsMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `ArmsMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `ArmsMode`

`Mode` 在代理层被解包成 `ArmsMode`。

### get_impedance

读取导纳拖拽模式。

```python
get_impedance(*, timeout_ms: int = 2000) -> ImpedanceMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `ImpedanceMode`

`Impedance` 在代理层被解包成 `ImpedanceMode`。

### set_impedance

切换导纳拖拽模式；`DISABLED` 恢复刚性位置控制。

```python
set_impedance(mode: ImpedanceMode, *, timeout_ms: int = 5000) -> ImpedanceMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `ImpedanceMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `5000` | 调用超时（毫秒） |

**返回** `ImpedanceMode`

`Impedance` 在代理层被解包成 `ImpedanceMode`。

```python
from fabot.capabilities.arms import ImpedanceMode

robot.arms.set_impedance(ImpedanceMode.LOW)   # 轻导纳拖拽示教
# ... 手动拖动双臂 ...
robot.arms.set_impedance(ImpedanceMode.DISABLED)
```

### get_brake

查询抱闸状态。

```python
get_brake(*, timeout_ms: int = 10000) -> DualBrakeState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | 调用超时（毫秒） |

**返回** `DualBrakeState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left_open` | `bool` | 左臂抱闸是否松开 |
| `right_open` | `bool` | 右臂抱闸是否松开 |

### set_brake

同时松开或闭合双臂抱闸，返回两侧状态。

```python
set_brake(open: bool, *, timeout_ms: int = 10000) -> DualBrakeState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `open` | `bool` | （必填） | `True` 松闸 |
| `timeout_ms` | `int` | `10000` | 调用超时（毫秒） |

**返回** `DualBrakeState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left_open` | `bool` | 左臂抱闸是否松开 |
| `right_open` | `bool` | 右臂抱闸是否松开 |

### get_joint_velocity_limit

读取关节速度上限。

```python
get_joint_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_joint_velocity_limit

设置关节速度上限，返回生效值。

```python
set_joint_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 关节速度上限 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_linear_velocity_limit

读取线速度上限。

```python
get_linear_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_velocity_limit

设置线速度上限，返回生效值。

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线速度上限，米/秒 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_velocity_limit

读取角速度上限。

```python
get_angular_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_velocity_limit

设置角速度上限，返回生效值。

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角速度上限，弧度/秒 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_joint_acceleration_limit

读取关节加速度上限。

```python
get_joint_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_joint_acceleration_limit

设置关节加速度上限，返回生效值。

```python
set_joint_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 关节加速度上限 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_linear_acceleration_limit

读取线加速度上限。

```python
get_linear_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_acceleration_limit

设置线加速度上限，返回生效值。

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线加速度上限，米/秒² |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_acceleration_limit

读取角加速度上限。

```python
get_angular_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_acceleration_limit

设置角加速度上限，返回生效值。

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角加速度上限，弧度/秒² |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### servo_pose

双臂位姿伺服，返回实际生效位姿。

```python
servo_pose(*, left: Pose3d, right: Pose3d, timeout_ms: int = 1000) -> DualPose
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `left` | `Pose3d` | （必填） |  |
| `right` | `Pose3d` | （必填） |  |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `DualPose`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left` | `Pose3d` | 左 |
| `right` | `Pose3d` | 右 |

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
| `pose_position_tolerance` | `float` | 位姿位置到位容差（米）；须为有限正数 |
| `pose_orientation_tolerance` | `float` | 位姿姿态容差，取 `1 - |dot(q, q_target)|`，不是弧度 |
| `max_timeout_s` | `float` | 在运动时长之上追加的到位等待上限（秒） |

### set_arrival_thresholds

整体替换该槽位的到位判定阈值；只改内存，不持久化，后续运动生效。

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, pose_position_tolerance: float = 0.02, pose_orientation_tolerance: float = 0.05, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholds
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | 关节到位容差（弧度） |
| `pose_position_tolerance` | `float` | `0.02` | 位姿位置容差（米） |
| `pose_orientation_tolerance` | `float` | `0.05` | 位姿姿态容差，取 `1 - |dot(q, q_target)|` |
| `max_timeout_s` | `float` | `5.0` | 追加到位等待上限（秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholds`

| 字段 | 类型 | 说明 |
|------|------|------|
| `joint_tolerance` | `float` | 关节到位容差（弧度）；须为有限正数 |
| `pose_position_tolerance` | `float` | 位姿位置到位容差（米）；须为有限正数 |
| `pose_orientation_tolerance` | `float` | 位姿姿态容差，取 `1 - |dot(q, q_target)|`，不是弧度 |
| `max_timeout_s` | `float` | 在运动时长之上追加的到位等待上限（秒） |

### move_joint

关节空间运动。`tolerance` 为到位容差，`duration` 为期望时长，`wait_timeout` 为额外到位等待；三者取 0 均表示沿用缺省。

```python
move_joint(target: DualJoints, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `DualJoints` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_joint_path

沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。

```python
move_joint_path(waypoints: list[DualJoints], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[DualJoints]` | （必填） | 路点序列，至少两个 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointPathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose

末端位姿绝对运动。参考系取 `target.frame_id`，空串缺省槽位基准；`end_frame` 空串缺省当前 TCP 或法兰。

```python
move_pose(target: DualPose, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `DualPose` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_relative

末端位姿增量运动。`target` 表示相对当前位姿的增量。

```python
move_pose_relative(target: DualPose, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseRelativeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `DualPose` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseRelativeOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_path

沿末端位姿路点序列运动，每个路点自带 `frame_id`。

```python
move_pose_path(waypoints: list[DualPose], *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePosePathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[DualPose]` | （必填） | 路点序列，至少两个 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePosePathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_arc_by_points

三点圆弧运动：起点为当前位姿，经 `via` 到 `end`。

```python
move_pose_arc_by_points(target: DualPoseArcByPoints, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByPointsOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `DualPoseArcByPoints` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseArcByPointsOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_arc_by_center

圆心圆弧运动：圆心由 `center.frame_id` 定位。

```python
move_pose_arc_by_center(target: DualPoseArcByCenter, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByCenterOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `DualPoseArcByCenter` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseArcByCenterOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joint()

双臂关节状态流。

```python
joint(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `DualJointState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `left` | `JointState` | 左 |
| `right` | `JointState` | 右 |

### pose()

双臂末端位姿流。

```python
pose(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `DualPose`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `left` | `Pose3d` | 左 |
| `right` | `Pose3d` | 右 |

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

`move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center` 共用资源 `arms`，策略 `queue`。
