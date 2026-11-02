---
title: 灵巧手 Hand
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 灵巧手 Hand

## 模块概述

- 能力 id：`hand`；槽位：`robot.left_hand` / `robot.right_hand`
- 能力域：`motion`；能力版本：`1.1.0`
- 多指灵巧手：逐关节开合度、速度 / 力上限、五指触觉阵列与关节 / 开合度长时运动。
- 开合度与关节角都是按手控制器 `joints` 顺序排列的数组；`move_opening` 逐关节线性插值到开 / 闭配置。

所有运动 Operation 共用资源 `hand`，策略 `queue`。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_opening` | Command | 读取各关节开合度；默认超时 1000 ms。 |
| `get_joint` | Command | 读取当前关节采样：位置、速度、力矩与时间戳；默认超时 1000 ms。 |
| `get_tactile` | Command | 读取五指触觉阵列与总接触力；默认超时 1000 ms。 |
| `get_velocity_limit` | Command | 读取速度上限；默认超时 1000 ms。 |
| `set_velocity_limit` | Command | 设置速度上限，返回生效值；默认超时 8000 ms。 |
| `get_force_limit` | Command | 读取力上限；默认超时 1000 ms。 |
| `set_force_limit` | Command | 设置力上限，返回生效值；默认超时 8000 ms。 |
| `servo_opening` | Command | 下发一次开合度伺服目标，返回生效值；默认超时 1000 ms。 |
| `servo_joint` | Command | 下发一次关节伺服目标；默认超时 1000 ms。 |
| `get_arrival_thresholds` | Command | 读取该槽位的到位判定阈值；默认超时 1000 ms。 |
| `set_arrival_thresholds` | Command | 整体替换该槽位的到位判定阈值；只改内存，不持久化，后续运动生效；默认超时 1000 ms。 |
| `move_opening` | Operation | 开合度运动。 |
| `move_joint` | Operation | 关节弧度运动。 |
| `move_joint_path` | Operation | 沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。 |
| `opening` | Channel | 开合度流，帧为 `Doubles`。 |
| `joint` | Channel | 关节位置流，帧为 `JointState`。 |
| `tactile` | Channel | 触觉阵列流，帧为 `HandTactile`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_opening

读取各关节开合度。

```python
get_opening(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### get_joint

读取当前关节采样：位置、速度、力矩与时间戳。

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

### get_tactile

读取五指触觉阵列与总接触力。

```python
get_tactile(*, timeout_ms: int = 1000) -> HandTactile
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `HandTactile`

| 字段 | 类型 | 说明 |
|------|------|------|
| `thumb` | `FingerTactile` | 拇指触觉阵列 |
| `index` | `FingerTactile` | 食指触觉阵列 |
| `middle` | `FingerTactile` | 中指触觉阵列 |
| `ring` | `FingerTactile` | 无名指触觉阵列 |
| `pinky` | `FingerTactile` | 小指触觉阵列 |
| `timestamp_us` | `int` | 采样时间戳（微秒） |

```python
tactile = robot.right_hand.get_tactile()
print(tactile.thumb.total_force, tactile.index.total_force)
```

### get_velocity_limit

读取速度上限。

```python
get_velocity_limit(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### set_velocity_limit

设置速度上限，返回生效值。

```python
set_velocity_limit(values: list[float], *, timeout_ms: int = 8000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `values` | `list[float]` | （必填） | 数值数组 |
| `timeout_ms` | `int` | `8000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### get_force_limit

读取力上限。

```python
get_force_limit(*, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### set_force_limit

设置力上限，返回生效值。

```python
set_force_limit(values: list[float], *, timeout_ms: int = 8000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `values` | `list[float]` | （必填） | 数值数组 |
| `timeout_ms` | `int` | `8000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### servo_opening

下发一次开合度伺服目标，返回生效值。

```python
servo_opening(values: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `values` | `list[float]` | （必填） | 数值数组 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`Doubles` 在代理层被解包成 `list[float]`。

### servo_joint

下发一次关节伺服目标。

```python
servo_joint(positions: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `positions` | `list[float]` | （必填） |  |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `list[float]`

`JointPositions` 在代理层被解包成 `list[float]`。

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
set_arrival_thresholds(*, joint_tolerance: float = 0.02, max_timeout_s: float = 10.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | 关节到位容差（弧度） |
| `max_timeout_s` | `float` | `10.0` | 追加到位等待上限（秒） |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ArrivalThresholdsApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `applied` | `ArrivalThresholds` | 实际生效的配置 |

### move_opening

开合度运动。`tolerance` 用开合度单位；`duration` 取 0 时用槽位 `max_timeout_s`。

```python
move_opening(target: list[float], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveOpeningOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `list[float]` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MoveOpeningOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_joint

关节弧度运动。`tolerance` 单位弧度；`duration` 取 0 时用槽位 `max_timeout_s`。

```python
move_joint(target: list[float], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveJointOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `list[float]` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MoveJointOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_joint_path

沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。

```python
move_joint_path(waypoints: list[JointPositions], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveJointPathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[JointPositions]` | （必填） | 路点序列，至少两个 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |

返回 `MoveJointPathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### opening()

开合度流。

```python
opening(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `Doubles`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `values` | `list[float]` | 数值数组 |

### joint()

关节位置流。

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

### tactile()

触觉阵列流。

```python
tactile(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `HandTactile`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `thumb` | `FingerTactile` | 拇指触觉阵列 |
| `index` | `FingerTactile` | 食指触觉阵列 |
| `middle` | `FingerTactile` | 中指触觉阵列 |
| `ring` | `FingerTactile` | 无名指触觉阵列 |
| `pinky` | `FingerTactile` | 小指触觉阵列 |
| `timestamp_us` | `int` | 采样时间戳（微秒） |

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

`move_opening` / `move_joint` / `move_joint_path` 共用资源 `hand`，策略 `queue`。
