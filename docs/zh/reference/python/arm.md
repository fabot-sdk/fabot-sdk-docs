---
title: 机械臂 Arm
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 机械臂 Arm

## 模块概述

- 能力 id：`arm`；槽位：`robot.left_arm` / `robot.right_arm`
- 能力域：`motion`；能力版本：`1.1.0`
- 单臂关节运动、末端位姿运动、六维力读取与柔顺控制。左右臂是同一套 API、各自独立的槽位。
- 命令参考系取 `Pose3d.frame_id`，空串缺省 `arm_base`；`end_frame` 空串缺省当前工具 TCP，无工具时为法兰。

臂上所有运动 Operation 共用资源 `arm`，策略为 `queue`：同臂新任务排队，不并发。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `get_joint` | `Empty` | `JointState` | 1000 ms |
| `get_pose` | `PoseQuery` | `Pose3d` | 1000 ms |
| `get_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `get_filtered_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `get_joint_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_linear_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_linear_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_angular_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_angular_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_joint_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_linear_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_linear_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_angular_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_angular_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_brake` | `Empty` | `BrakeState` | 10000 ms |
| `set_brake` | `BrakeState` | `BrakeState` | 10000 ms |
| `get_enable` | `Empty` | `Enable` | 1000 ms |
| `set_enable` | `Enable` | `Enable` | 3000 ms |
| `set_wrench_zero` | `WrenchZero` | `WrenchZero` | 1000 ms |
| `get_compliance_mask` | `Empty` | `Doubles` | 1000 ms |
| `set_compliance_mask` | `Doubles` | `Doubles` | 1000 ms |
| `get_compliance_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `set_compliance_wrench` | `Wrench3d` | `Wrench3d` | 1000 ms |
| `get_compliance_linear_limit` | `Empty` | `Float64` | 1000 ms |
| `set_compliance_linear_limit` | `Float64` | `Float64` | 1000 ms |
| `get_compliance_angular_limit` | `Empty` | `Float64` | 1000 ms |
| `set_compliance_angular_limit` | `Float64` | `Float64` | 1000 ms |
| `servo_pose` | `Pose3d` | `Pose3d` | 3000 ms |
| `servo_twist` | `Twist3d` | `Twist3d` | 1000 ms |
| `get_arrival_thresholds` | `Empty` | `ArrivalThresholds` | 1000 ms |
| `set_arrival_thresholds` | `ArrivalThresholds` | `ArrivalThresholdsApplied` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

| 方法 | 请求 | 类型 | 资源 | 默认时限 |
|------|------|------|------|------|
| `move_joint` | `JointMove` | Operation | arm | — |
| `move_joint_path` | `JointPathMove` | Operation | arm | — |
| `move_pose` | `PoseMove` | Operation | arm | — |
| `move_pose_relative` | `PoseMove` | Operation | arm | — |
| `move_pose_path` | `PosePathMove` | Operation | arm | — |
| `move_pose_arc_by_points` | `PoseArcPointsMove` | Operation | arm | — |
| `move_pose_arc_by_center` | `PoseArcCenterMove` | Operation | arm | — |

Operation 立即返回句柄，进度与结果通过快照获取；通用用法见 [命令与长时操作](../../usage/commands-operations.md)。

| 通道 | 内容 |
|------|------|
| `joint()` | `JointState` |
| `pose()` | `Pose3d` |
| `wrench()` | `Wrench3d` |
| `filtered_wrench()` | `Wrench3d` |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_joint

读取当前关节采样：位置（弧度）、速度、力矩与时间戳。

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

```python
joints = robot.left_arm.get_joint()
print(joints.positions, joints.velocities)

pose = robot.left_arm.get_pose(frame_id="base_link")
print(pose.x, pose.y, pose.z, pose.frame_id)
```

### get_pose

读取当前末端位姿。

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

### get_wrench

读取末端原始六维力（未滤波）。

```python
get_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Wrench3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_filtered_wrench

读取滤波后的末端六维力。

```python
get_filtered_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Wrench3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

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

### get_brake

查询抱闸状态。

```python
get_brake(*, timeout_ms: int = 10000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | 调用超时（毫秒） |

**返回** `bool`

`BrakeState` 在代理层被解包成 `bool`。

### set_brake

松开或闭合抱闸。

```python
set_brake(open: bool, *, timeout_ms: int = 10000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `open` | `bool` | （必填） | `True` 松闸 |
| `timeout_ms` | `int` | `10000` | 调用超时（毫秒） |

**返回** `bool`

`BrakeState` 在代理层被解包成 `bool`。

### get_enable

查询使能状态。

```python
get_enable(*, timeout_ms: int = 1000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `bool`

`Enable` 在代理层被解包成 `bool`。

### set_enable

使能或失能关节。

```python
set_enable(enabled: bool, *, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | 是否使能 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Enable` 在代理层被解包成 `bool`。

### set_wrench_zero

触发一次力传感器零偏标定。

```python
set_wrench_zero(zero: bool = True, *, timeout_ms: int = 1000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `zero` | `bool` | `True` | 是否执行零偏标定 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `bool`

`WrenchZero` 在代理层被解包成 `bool`。

### get_compliance_mask

读取柔顺控制各自由度权重。

```python
get_compliance_mask(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### set_compliance_mask

设置柔顺控制各自由度权重，返回生效值。

```python
set_compliance_mask(values: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `values` | `list[float]` | （必填） | 数值数组 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### get_compliance_wrench

读取柔顺控制的目标力。

```python
get_compliance_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Wrench3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### set_compliance_wrench

设置柔顺控制的目标力与力矩。

```python
set_compliance_wrench(*, force: Vector3d, torque: Vector3d, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Wrench3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `force` | `Vector3d` | （必填） | 力矢量，牛 |
| `torque` | `Vector3d` | （必填） | 力矩矢量，牛·米 |
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `stamp_ns` | `int` | `0` | 目标时刻（纳秒）；0 表示最新 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Wrench3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_compliance_linear_limit

读取柔顺控制的线位移限幅。

```python
get_compliance_linear_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_compliance_linear_limit

设置柔顺控制线位移限幅。

```python
set_compliance_linear_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 柔顺控制线位移限幅，米 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_compliance_angular_limit

读取柔顺控制的角位移限幅。

```python
get_compliance_angular_limit(*, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_compliance_angular_limit

设置柔顺控制角位移限幅。

```python
set_compliance_angular_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 柔顺控制角位移限幅，弧度 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### servo_pose

位姿伺服。可传完整的 `Pose3d`，也可只给 `x` / `y` / `z` / `qx` / `qy` / `qz` / `qw` 分量。

```python
servo_pose(target: Pose3d | None = None, *, x: float = 0.0, y: float = 0.0, z: float = 0.0, qx: float = 0.0, qy: float = 0.0, qz: float = 0.0, qw: float = 1.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 3000) -> Pose3d
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
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

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

### servo_twist

下发一次速度伺服目标，返回实际生效的速度。

```python
servo_twist(*, linear: Vector3d, angular: Vector3d, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Twist3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `linear` | `Vector3d` | （必填） | 线速度矢量，米/秒 |
| `angular` | `Vector3d` | （必填） | 角速度矢量，米/秒或弧度/秒 |
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `stamp_ns` | `int` | `0` | 目标时刻（纳秒）；0 表示最新 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Twist3d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `linear` | `Vector3d` | 线速度矢量，米/秒 |
| `angular` | `Vector3d` | 角速度矢量，弧度/秒 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

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

整体替换该槽位的到位判定阈值，返回 `outcome` 与实际生效值。到位判定要求连续两次采样都在阈值内。

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, pose_position_tolerance: float = 0.02, pose_orientation_tolerance: float = 0.05, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | 关节到位容差（弧度） |
| `pose_position_tolerance` | `float` | `0.02` | 位姿位置容差（米） |
| `pose_orientation_tolerance` | `float` | `0.05` | 位姿姿态容差，取 `1 - |dot(q, q_target)|` |
| `max_timeout_s` | `float` | `5.0` | 追加到位等待上限（秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholdsApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `applied` | `ArrivalThresholds` | 实际生效的配置 |

### move_joint

关节空间运动。`tolerance` 为到位容差（弧度），`duration` 为期望时长，`wait_timeout` 为额外到位等待；取 0 均表示沿用缺省。目标也可直接传 `list[float]`，会自动包装为 `JointPositions`。

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

positions = list(robot.left_arm.get_joint().positions)
positions[1] += 0.2
op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)
result = op.wait(timeout=10.0)          # 等终态，失败时抛错
print(result.success, result.status_message)
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

```python
from fabot.types import Pose3d

op = robot.right_arm.move_pose(
    Pose3d(x=0.3, y=0.0, z=0.4, qw=1.0, frame_id="arm_base"),
    position_tolerance=0.01,
)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

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

### move_pose_path

沿末端位姿路点序列运动，每个路点自带 `frame_id`。

```python
move_pose_path(waypoints: list[Pose3d], *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePosePathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[Pose3d]` | （必填） | 路点序列，至少两个 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePosePathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_arc_by_points

三点圆弧运动：起点为当前位姿，经 `via` 到 `end`。

```python
move_pose_arc_by_points(target: PoseArcByPoints, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByPointsOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `PoseArcByPoints` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseArcByPointsOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_arc_by_center

圆心圆弧运动：圆心由 `center.frame_id` 定位。

```python
move_pose_arc_by_center(target: PoseArcByCenter, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByCenterOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `PoseArcByCenter` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseArcByCenterOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joint()

关节状态流。

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

末端位姿流。

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

### wrench()

原始六维力流。

```python
wrench(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Wrench3d`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### filtered_wrench()

滤波后的六维力流。

```python
filtered_wrench(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Wrench3d`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `force` | `Vector3d` | 力矢量，牛 |
| `torque` | `Vector3d` | 力矩矢量，牛·米 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

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

`move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center` 共用资源 `arm`，策略 `queue`：同臂新任务排队执行。其余方法都是短命令。
