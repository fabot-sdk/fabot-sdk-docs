---
title: 底盘 Chassis
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 底盘 Chassis

## 模块概述

- 能力 id：`chassis`；槽位：`robot.chassis`
- 底盘运动控制：速度指令、限速与限加速度、站点导航、相对移动、重定位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `stop` | — | `OutcomeT` | Command |
| `set_max_speed` | `linear`, `angular` | `MaxSpeedAppliedT` | Command |
| `get_max_speed` | — | `MaxSpeedT` | Command |
| `set_max_acceleration` | `linear`, `angular` | `MaxAccelerationAppliedT` | Command |
| `get_max_acceleration` | — | `MaxAccelerationT` | Command |
| `set_velocity` | `vx`, `vy`, `vtheta` | `OutcomeT` | Command |
| `pause` | — | `OutcomeT` | Command |
| `resume` | — | `OutcomeT` | Command |
| `list_stations` | — | `StationListT` | Command |
| `get_status` | — | `ChassisStatusT` | Command |
| `move_relative` | `dx`, `dy`, `dtheta` | `MoveRelativeOperation` | Operation |
| `navigate_to_station` | `station_id`, `mode` | `NavigateToStationOperation` | Operation |
| `relocalize` | `pose` | `RelocalizeOperation` | Operation |

Command 默认 `timeout_ms`：`set_velocity` 为 2000，`stop` / `list_stations` 为 5000，其余均为 3000（均可覆盖）。参数均为关键字参数。

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### stop

立即停止底盘运动。

```python
stop(*, timeout_ms: int = 5000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `5000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | 是否成功 |
| `statusMessage` | `str` | 状态说明 |

### set_max_speed

设置最大速度限制。

```python
set_max_speed(*, linear: float, angular: float, timeout_ms: int = 3000) -> MaxSpeedAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `linear` | `float` | （必填） | 最大线速度，单位米/秒 |
| `angular` | `float` | （必填） | 最大角速度，单位弧度/秒 |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`MaxSpeedAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedLinear` | `float` | 实际生效的最大线速度（米/秒） |
| `appliedAngular` | `float` | 实际生效的最大角速度（弧度/秒） |

```python
applied = robot.chassis.set_max_speed(linear=0.5, angular=0.8)
print(applied.outcome.success, applied.appliedLinear, applied.appliedAngular)
```

### get_max_speed

读取当前最大速度限制。

```python
get_max_speed(*, timeout_ms: int = 3000) -> MaxSpeedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`MaxSpeedT`：`linear`（米/秒）、`angular`（弧度/秒）。

### set_max_acceleration

设置最大加速度限制。

```python
set_max_acceleration(*, linear: float, angular: float, timeout_ms: int = 3000) -> MaxAccelerationAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `linear` | `float` | （必填） | 最大线加速度，单位米/秒² |
| `angular` | `float` | （必填） | 最大角加速度，单位弧度/秒² |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`MaxAccelerationAppliedT`：`outcome`（`OutcomeT`）、`appliedLinear`、`appliedAngular`，含义同 `set_max_speed`。

### get_max_acceleration

读取当前最大加速度限制。

```python
get_max_acceleration(*, timeout_ms: int = 3000) -> MaxAccelerationT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`MaxAccelerationT`：`linear`（米/秒²）、`angular`（弧度/秒²）。

### set_velocity

下发速度指令。

```python
set_velocity(*, vx: float, vy: float, vtheta: float, timeout_ms: int = 2000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `vx` | `float` | （必填） | 前向线速度，单位米/秒 |
| `vy` | `float` | （必填） | 侧向线速度，单位米/秒 |
| `vtheta` | `float` | （必填） | 角速度，单位弧度/秒 |
| `timeout_ms` | `int` | `2000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)   # m/s, rad/s
# ... 运动一段时间后停止
outcome = robot.chassis.stop()
print(outcome.success, outcome.statusMessage)
```

### pause

暂停当前运动或导航任务。

```python
pause(*, timeout_ms: int = 3000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

### resume

恢复被 `pause` 暂停的运动或导航任务。

```python
resume(*, timeout_ms: int = 3000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
robot.chassis.pause()
# ... 确认周围环境安全
robot.chassis.resume()
```

### list_stations

列出地图上的导航站点。

```python
list_stations(*, timeout_ms: int = 5000) -> StationListT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `5000` | Command 超时（毫秒） |

**返回**

`StationListT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `stations` | `list[StationInfoT]` | 站点列表；每项含 `stationId`（`int`）与 `name`（`str`） |
| `statusMessage` | `str` | 状态说明 |

```python
result = robot.chassis.list_stations()
for station in result.stations:
    print(station.stationId, station.name)
```

### get_status

读取底盘运动状态快照。

```python
get_status(*, timeout_ms: int = 3000) -> ChassisStatusT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`ChassisStatusT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `pose` | `Pose2dT` \| `None` | 当前位姿：`x` / `y`（米），`theta`（弧度） |
| `velocity` | `Twist2dT` \| `None` | 当前速度：`vx` / `vy`（米/秒），`vtheta`（弧度/秒） |
| `socPercent` | `int` | 电量百分比 |
| `controlMode` | `ControlMode` | 控制模式：`MANUAL` / `AUTONOMOUS` |
| `motionState` | `MotionState` | 运动状态：`IDLE` / `MOVING` / `PAUSED` / `FAULTED` |
| `targetStationId` | `int` | 当前目标站点 id |
| `statusMessage` | `str` | 状态说明 |

```python
status = robot.chassis.get_status()
print(status.motionState, status.socPercent, status.pose.x, status.pose.y)
```

### move_relative

相对当前位姿执行长时移动，返回可轮询、可取消的 Operation。

```python
move_relative(*, dx: float, dy: float, dtheta: float) -> MoveRelativeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `dx` | `float` | （必填） | 前向位移，单位米 |
| `dy` | `float` | （必填） | 侧向位移，单位米 |
| `dtheta` | `float` | （必填） | 转角，单位弧度 |

**返回**

`MoveRelativeOperation`。通过 `get()` / `events()` 取快照，也可 `cancel()`。快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `feedback` | `ChassisProgressT` \| `None` | `progress`（`float`）、`statusMessage`（`str`）、`taskId`（`int`） |
| `result` | `ChassisOutcomeT` \| `None` | `success`（`bool`）、`statusMessage`（`str`）、`taskId`（`int`） |
| `error` | `FabotError` \| `None` | 失败原因 |

```python
op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### navigate_to_station

导航到指定站点，返回可轮询、可取消的 Operation。快照字段与 `move_relative` 相同：`state` / `feedback: ChassisProgressT` / `result: ChassisOutcomeT` / `error`，可 `cancel()`。

```python
navigate_to_station(*, station_id: int, mode: NavigationMode) -> NavigateToStationOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `station_id` | `int` | （必填） | 目标站点 id，取自 `list_stations()` |
| `mode` | `NavigationMode` | （必填） | `AUTONOMOUS`（自主导航）/ `LINE_FOLLOW`（循线）/ `POINT_TO_POINT`（点到点） |

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.list_stations().stations
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId, mode=NavigationMode.AUTONOMOUS,
)
snap = op.get(timeout_ms=60000)
print(snap.state, snap.result)
```

### relocalize

以指定位姿重定位底盘，返回可轮询、可取消的 Operation。快照字段与 `move_relative` 相同。

```python
relocalize(*, pose: Pose2dT) -> RelocalizeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pose` | `Pose2dT` | （必填） | 重定位位姿：`x` / `y`（米），`theta`（弧度） |

```python
from fabot.types.Pose2d import Pose2dT

pose = Pose2dT()
pose.x, pose.y, pose.theta = 1.0, 2.0, 0.0
op = robot.chassis.relocalize(pose=pose)
```

## 通道

本模块没有数据通道。通用通道用法见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.chassis.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.chassis.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.chassis.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.chassis.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.chassis.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.chassis.faults()`，返回 `Faults`。

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

本模块没有 `status()`；底盘运动状态快照用 [`get_status()`](#get_status)，整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

`move_relative` / `navigate_to_station` / `relocalize` 共享同一底盘资源，新任务排队执行，不并发。
