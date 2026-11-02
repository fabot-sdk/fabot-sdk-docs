---
title: 底盘 Chassis
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 底盘 Chassis

## 模块概述

- 能力 id：`chassis`；槽位：`robot.chassis`
- 能力域：`motion`；能力版本：`1.1.0`
- 底盘平面运动：速度伺服、地图系绝对 / 相对位姿导航、站点导航，以及驻停、锁止、暂停等状态控制。
- `ChassisMode.MANUAL` 允许 `servo_twist` 与车体相对移动，`AUTONOMOUS` 允许地图导航；`NavigationMode` 只影响导航规划方式。

所有导航 Operation 共用资源 `chassis`，策略 `queue`，默认时限 180 秒。
`get_stage()` / `stage()` 给出的 `ChassisStage` 是只读运动阶段，由任务与故障投影产生，没有对应的 set 方法。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_pose` | Command | 读取地图系位姿；默认超时 3000 ms。 |
| `set_pose` | Command | 把地图系位姿重置为给定值（重定位），返回生效位姿；默认超时 5000 ms。 |
| `get_twist` | Command | 读取当前速度；默认超时 3000 ms。 |
| `get_stage` | Command | 读取当前运动阶段；默认超时 3000 ms。 |
| `get_station` | Command | 读取地图站点列表（`get_stations` 是别名）；默认超时 5000 ms。 |
| `get_mode` | Command | 读取当前模式；默认超时 3000 ms。 |
| `set_mode` | Command | 切换手动 / 自主方式；默认超时 3000 ms。 |
| `get_parking` | Command | 查询是否驻停锁死；默认超时 3000 ms。 |
| `set_parking` | Command | 设置驻停锁死状态；默认超时 3000 ms。 |
| `get_lock` | Command | 查询底盘自由度是否被锁止；默认超时 3000 ms。 |
| `set_lock` | Command | 锁止或解锁底盘自由度；默认超时 3000 ms。 |
| `get_pause` | Command | 查询在途导航是否被暂停；默认超时 3000 ms。 |
| `set_pause` | Command | 暂停或恢复在途导航；不销毁 `move_*` 句柄；默认超时 3000 ms。 |
| `get_linear_velocity_limit` | Command | 读取线速度上限；默认超时 3000 ms。 |
| `set_linear_velocity_limit` | Command | 设置线速度上限，返回生效值；默认超时 3000 ms。 |
| `get_angular_velocity_limit` | Command | 读取角速度上限；默认超时 3000 ms。 |
| `set_angular_velocity_limit` | Command | 设置角速度上限，返回生效值；默认超时 3000 ms。 |
| `get_linear_acceleration_limit` | Command | 读取线加速度上限；默认超时 3000 ms。 |
| `set_linear_acceleration_limit` | Command | 设置线加速度上限，返回生效值；默认超时 3000 ms。 |
| `get_angular_acceleration_limit` | Command | 读取角加速度上限；默认超时 3000 ms。 |
| `set_angular_acceleration_limit` | Command | 设置角加速度上限，返回生效值；默认超时 3000 ms。 |
| `servo_twist` | Command | 速度伺服，返回实际生效速度；默认超时 2000 ms。 |
| `move_pose` | Operation | 地图系绝对位姿导航；默认时限 180 秒。 |
| `move_pose_relative` | Operation | 车体系相对位移导航，`target.x` / `y` / `theta` 即 `dx` / `dy` / `dyaw`；默认时限 180 秒。 |
| `move_station` | Operation | 导航到地图站点，`station_id` 取自 `get_station()`；默认时限 180 秒。 |
| `pose` | Channel | 地图系位姿流，帧为 `Pose2d`。 |
| `twist` | Channel | 速度流，帧为 `Twist2d`。 |
| `stage` | Channel | 运动阶段流，帧为 `Stage`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

本页方法用到的枚举：

**`ChassisMode` 枚举**

| 取值 | 说明 |
|------|------|
| `MANUAL` | 手动：允许 `servo_twist` 与车体相对移动 |
| `AUTONOMOUS` | 自主：允许地图导航 |

**`NavigationMode` 枚举**

| 取值 | 说明 |
|------|------|
| `AUTONOMOUS` | 自主规划 |
| `LINE_FOLLOW` | 循线 |
| `POINT_TO_POINT` | 点到点 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_pose

读取地图系位姿。

```python
get_pose(*, timeout_ms: int = 3000) -> Pose2d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `Pose2d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `theta` | `float` | 航向角，弧度 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### set_pose

把地图系位姿重置为给定值（重定位），返回生效位姿。

```python
set_pose(*, x: float, y: float, theta: float = 0.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 5000) -> Pose2d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `x` | `float` | （必填） | X 分量，米 |
| `y` | `float` | （必填） | Y 分量，米 |
| `theta` | `float` | `0.0` | 航向角，弧度 |
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `stamp_ns` | `int` | `0` | 目标时刻（纳秒）；0 表示最新 |
| `timeout_ms` | `int` | `5000` | 调用超时（毫秒） |

**返回** `Pose2d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `theta` | `float` | 航向角，弧度 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_twist

读取当前速度。

```python
get_twist(*, timeout_ms: int = 3000) -> Twist2d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `Twist2d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `vx` | `float` | 车体系 X 线速度，米/秒 |
| `vy` | `float` | 车体系 Y 线速度，米/秒 |
| `vtheta` | `float` | 角速度，弧度/秒 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_stage

读取当前运动阶段。

```python
get_stage(*, timeout_ms: int = 3000) -> ChassisStage
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `ChassisStage`

`Stage` 在代理层被解包成 `ChassisStage`。

**`ChassisStage` 枚举**

| 取值 | 说明 |
|------|------|
| `IDLE` | 空闲 |
| `MOVING` | 运动中 |
| `PAUSED` | 已暂停 |
| `FAULTED` | 故障 |

### get_station

读取地图站点列表。`get_stations` 是别名。

```python
get_station(*, timeout_ms: int = 5000) -> list[StationInfo]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `5000` | 调用超时（毫秒） |

**返回** `list[StationInfo]`

`Stations` 在代理层被解包成 `list[StationInfo]`。

**元素字段** `StationInfo`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `int` | 站点 id |
| `name` | `str` | 站点名称 |
| `pose` | `Pose2d` | 站点位姿；缺省表示后端未提供 |

```python
for station in robot.chassis.get_station():
    print(station.id, station.name)
```

### get_mode

读取当前模式。

```python
get_mode(*, timeout_ms: int = 3000) -> ChassisMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `ChassisMode`

`Mode` 在代理层被解包成 `ChassisMode`。

**`ChassisMode` 枚举**

| 取值 | 说明 |
|------|------|
| `MANUAL` | 手动：允许 `servo_twist` 与车体相对移动 |
| `AUTONOMOUS` | 自主：允许地图导航 |

### set_mode

切换手动 / 自主方式。

```python
set_mode(mode: ChassisMode, *, timeout_ms: int = 3000) -> ChassisMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `ChassisMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `ChassisMode`

`Mode` 在代理层被解包成 `ChassisMode`。

**`ChassisMode` 枚举**

| 取值 | 说明 |
|------|------|
| `MANUAL` | 手动：允许 `servo_twist` 与车体相对移动 |
| `AUTONOMOUS` | 自主：允许地图导航 |

### get_parking

查询是否驻停锁死。

```python
get_parking(*, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Parking` 在代理层被解包成 `bool`。

### set_parking

设置驻停锁死状态。

```python
set_parking(*, parked: bool, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `parked` | `bool` | （必填） | `True` 驻停锁死 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Parking` 在代理层被解包成 `bool`。

### get_lock

查询底盘自由度是否被锁止。

```python
get_lock(*, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Lock` 在代理层被解包成 `bool`。

### set_lock

锁止或解锁底盘自由度。

```python
set_lock(*, locked: bool, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `locked` | `bool` | （必填） | `True` 锁止该自由度 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Lock` 在代理层被解包成 `bool`。

### get_pause

查询在途导航是否被暂停。

```python
get_pause(*, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Pause` 在代理层被解包成 `bool`。

### set_pause

暂停或恢复在途导航；不销毁 `move_*` 句柄。

```python
set_pause(*, paused: bool, timeout_ms: int = 3000) -> bool
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `paused` | `bool` | （必填） | `True` 暂停在途导航 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `bool`

`Pause` 在代理层被解包成 `bool`。

### get_linear_velocity_limit

读取线速度上限。

```python
get_linear_velocity_limit(*, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_velocity_limit

设置线速度上限，返回生效值。

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线速度上限，米/秒 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_velocity_limit

读取角速度上限。

```python
get_angular_velocity_limit(*, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_velocity_limit

设置角速度上限，返回生效值。

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角速度上限，弧度/秒 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_linear_acceleration_limit

读取线加速度上限。

```python
get_linear_acceleration_limit(*, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_linear_acceleration_limit

设置线加速度上限，返回生效值。

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 线加速度上限，米/秒² |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### get_angular_acceleration_limit

读取角加速度上限。

```python
get_angular_acceleration_limit(*, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### set_angular_acceleration_limit

设置角加速度上限，返回生效值。

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 角加速度上限，弧度/秒² |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `float`

`Float64` 在代理层被解包成 `float`。

### servo_twist

速度伺服，返回实际生效速度。`MANUAL` 模式下才允许。

```python
servo_twist(*, vx: float, vy: float, vtheta: float = 0.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 2000) -> Twist2d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `vx` | `float` | （必填） | 车体系 X 线速度，米/秒 |
| `vy` | `float` | （必填） | 车体系 Y 线速度，米/秒 |
| `vtheta` | `float` | `0.0` | 角速度，弧度/秒 |
| `frame_id` | `str` | `""` | 参考坐标系；空串表示槽位缺省基准 |
| `stamp_ns` | `int` | `0` | 目标时刻（纳秒）；0 表示最新 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `Twist2d`

| 字段 | 类型 | 说明 |
|------|------|------|
| `vx` | `float` | 车体系 X 线速度，米/秒 |
| `vy` | `float` | 车体系 Y 线速度，米/秒 |
| `vtheta` | `float` | 角速度，弧度/秒 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

```python
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)
```

### move_pose

地图系绝对位姿导航。

```python
move_pose(target: Pose2d, *, mode: NavigationMode = NavigationMode.AUTONOMOUS, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0) -> MovePoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `Pose2d` | （必填） | 目标值 |
| `mode` | `NavigationMode` | `NavigationMode.AUTONOMOUS` | 模式取值 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MovePoseOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose_relative

车体系相对位移导航，`target.x` / `y` / `theta` 即 `dx` / `dy` / `dyaw`。

```python
move_pose_relative(target: Pose2d, *, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0) -> MovePoseRelativeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `Pose2d` | （必填） | 目标值 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MovePoseRelativeOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_station

导航到地图站点，`station_id` 取自 `get_station()`。

```python
move_station(station_id: int, *, mode: NavigationMode = NavigationMode.AUTONOMOUS, duration: float = 0.0) -> MoveStationOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `station_id` | `int` | （必填） | 站点 id |
| `mode` | `NavigationMode` | `NavigationMode.AUTONOMOUS` | 模式取值 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MoveStationOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.get_station()
op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
snap = op.get(timeout=5.0)
print(snap.state)
```

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### pose()

地图系位姿流。

```python
pose(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Pose2d`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `float` | X 坐标或分量，米 |
| `y` | `float` | Y 坐标或分量，米 |
| `theta` | `float` | 航向角，弧度 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### twist()

速度流。

```python
twist(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Twist2d`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `vx` | `float` | 车体系 X 线速度，米/秒 |
| `vy` | `float` | 车体系 Y 线速度，米/秒 |
| `vtheta` | `float` | 角速度，弧度/秒 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### stage()

运动阶段流。

```python
stage(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Stage`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `stage` | `ChassisStage` | 运动阶段（`ChassisStage`） |

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

`move_pose` / `move_pose_relative` / `move_station` 共用资源 `chassis`，策略 `queue`，默认时限 180 秒。
