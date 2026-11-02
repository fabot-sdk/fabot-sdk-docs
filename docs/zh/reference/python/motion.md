---
title: 运动 Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 运动 Motion

## 模块概述

- 能力 id：`motion`；槽位：`robot.motion`
- 能力域：`motion`；能力版本：`1.1.0`
- 全身运动控制：运动体制、全身关节 / 位姿目标、回零与预设构型，以及全身控制状态与质心稳定裕度。
- `MotionMode` 是控制体制（`HOLD` / `OCS2` / `MOVEJ`），与 `robot.state()` 的运行状态不是同一概念。

所有运动 Operation 共用资源 `motion_controller`，策略 `queue`，默认时限 60 秒。
`set_mode(COMPLIANCE)` 会被拒绝：当前控制栈没有可进入的顺应状态。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `get_joint` | `Empty` | `WholeBodyJointState` | 1000 ms |
| `get_wbc_state` | `Empty` | `WbcState` | 1000 ms |
| `get_center_of_mass` | `Empty` | `CenterOfMass` | 1000 ms |
| `get_mode` | `Empty` | `Mode` | 1000 ms |
| `set_mode` | `Mode` | `Mode` | 7000 ms |
| `servo_pose` | `WholeBodyPoseTarget` | `WholeBodyPoseTarget` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

| 方法 | 请求 | 类型 | 资源 | 默认时限 |
|------|------|------|------|------|
| `move_home` | `Home` | Operation | motion_controller | 60000 ms |
| `move_preset` | `Preset` | Operation | motion_controller | 60000 ms |
| `move_joint` | `JointMove` | Operation | motion_controller | 60000 ms |
| `move_joint_path` | `JointPath` | Operation | motion_controller | 60000 ms |
| `move_pose` | `PoseMove` | Operation | motion_controller | 60000 ms |

Operation 立即返回句柄，进度与结果通过快照获取；通用用法见 [命令与长时操作](../../usage/commands-operations.md)。

| 通道 | 内容 |
|------|------|
| `joint()` | `WholeBodyJointState` |
| `wbc_state()` | `WbcState` |
| `center_of_mass()` | `CenterOfMass` |

本页方法用到的枚举：

**`MotionMode` 枚举**

| 取值 | 说明 |
|------|------|
| `HOLD` | 保持当前构型 |
| `OCS2` | OCS2 全身控制 |
| `MOVEJ` | MoveJ 关节伺服从 |
| `COMPLIANCE` | 顺应控制；当前控制栈未实现，`set_mode` 会被拒绝 |

**`HomePose` 枚举**

| 取值 | 说明 |
|------|------|
| `PRIMARY` | 主零位 |
| `SECONDARY` | 次零位 |
| `TERTIARY` | 第三零位 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_joint

读取全身关节采样（躯干 / 左臂 / 右臂 / 头部）。

```python
get_joint(*, timeout_ms: int = 1000) -> WholeBodyJointState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `WholeBodyJointState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `body` | `JointState` | 躯干数据 |
| `left_arm` | `JointState` | 左臂数据 |
| `right_arm` | `JointState` | 右臂数据 |
| `head` | `JointState` | 头部数据 |

### get_wbc_state

读取全身控制状态：各部位模式、双臂使能与底盘锁止。

```python
get_wbc_state(*, timeout_ms: int = 1000) -> WbcState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `WbcState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `body_mode` | `BodyMode` | 躯干约束模式（`BodyMode`） |
| `head_mode` | `HeadMode` | 控制器 current_state 不回读头部模式；无观测时保持 DISABLE。 |
| `arms_mode` | `ArmsMode` | 双臂耦合模式（`ArmsMode`） |
| `left_arm_enabled` | `bool` | 左臂是否使能 |
| `right_arm_enabled` | `bool` | 右臂是否使能 |
| `chassis_locked` | `bool` | 底盘是否锁止 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_center_of_mass

读取质心投影与相对支撑矩形的稳定裕度。

```python
get_center_of_mass(*, timeout_ms: int = 1000) -> CenterOfMass
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `CenterOfMass`

| 字段 | 类型 | 说明 |
|------|------|------|
| `position` | `Vector3d` | 质心在 base_footprint 下的三维坐标，米。 |
| `status` | `SupportStatus` | 状态快照 |
| `min_safe_margin` | `float` | 相对支撑矩形的最小安全裕度，米 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### get_mode

读取当前模式。

```python
get_mode(*, timeout_ms: int = 1000) -> MotionMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `MotionMode`

`Mode` 在代理层被解包成 `MotionMode`。

**`MotionMode` 枚举**

| 取值 | 说明 |
|------|------|
| `HOLD` | 保持当前构型 |
| `OCS2` | OCS2 全身控制 |
| `MOVEJ` | MoveJ 关节伺服从 |
| `COMPLIANCE` | 顺应控制；当前控制栈未实现，`set_mode` 会被拒绝 |

### set_mode

切换运动体制，返回生效体制。

```python
set_mode(mode: MotionMode, *, timeout_ms: int = 7000) -> MotionMode
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `MotionMode` | （必填） | 模式取值 |
| `timeout_ms` | `int` | `7000` | 调用超时（毫秒） |

**返回** `MotionMode`

`Mode` 在代理层被解包成 `MotionMode`。

```python
from fabot.capabilities.motion import MotionMode

applied = robot.motion.set_mode(MotionMode.OCS2)
print(applied)
print(robot.motion.get_wbc_state().body_mode)
```

### servo_pose

全身位姿伺服：三个部位都给目标位姿，返回实际生效值。

```python
servo_pose(*, left_arm: Pose3d, right_arm: Pose3d, body: Pose3d, timeout_ms: int = 1000) -> WholeBodyPoseTarget
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `left_arm` | `Pose3d` | （必填） | 左臂目标位姿 |
| `right_arm` | `Pose3d` | （必填） | 右臂目标位姿 |
| `body` | `Pose3d` | （必填） | 躯干目标位姿 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `WholeBodyPoseTarget`

| 字段 | 类型 | 说明 |
|------|------|------|
| `left_arm` | `Pose3d` | 左臂数据 |
| `right_arm` | `Pose3d` | 右臂数据 |
| `body` | `Pose3d` | 躯干数据 |

### move_home

回到预设零位。`HomePose.PRIMARY` 是默认目标。

```python
move_home(target: HomePose = HomePose.PRIMARY, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHomeOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `HomePose` | `HomePose.PRIMARY` | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveHomeOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
from fabot.capabilities.motion import HomePose

robot.motion.move_home(HomePose.PRIMARY, duration=5.0).wait(timeout=30.0)
```

### move_preset

运动到具名预设构型。

```python
move_preset(target: str, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePresetOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `str` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePresetOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_joint

关节空间运动。`tolerance` 为到位容差，`duration` 为期望时长，`wait_timeout` 为额外到位等待；三者取 0 均表示沿用缺省。

```python
move_joint(target: WholeBodyJointTarget, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `WholeBodyJointTarget` | （必填） | 目标值 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_joint_path

沿关节路点序列运动；至少两个路点，当前关节接到第一个路点。

```python
move_joint_path(waypoints: list[WholeBodyJointTarget], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `waypoints` | `list[WholeBodyJointTarget]` | （必填） | 路点序列，至少两个 |
| `tolerance` | `float` | `0.0` | 到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MoveJointPathOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

### move_pose

末端位姿绝对运动。参考系取 `target.frame_id`，空串缺省槽位基准；`end_frame` 空串缺省当前 TCP 或法兰。

```python
move_pose(target: WholeBodyPoseTarget, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `WholeBodyPoseTarget` | （必填） | 目标值 |
| `end_frame` | `str` | `""` | 受控末端坐标系；空串表示当前工具 TCP，无工具时为法兰 |
| `position_tolerance` | `float` | `0.0` | 位置到位容差（米）；0 表示沿用槽位缺省 |
| `orientation_tolerance` | `float` | `0.0` | 姿态到位容差；0 表示沿用槽位缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；0 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 额外到位等待（秒）；0 表示沿用缺省等待策略 |

返回 `MovePoseOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joint()

全身关节状态流。

```python
joint(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `WholeBodyJointState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `body` | `JointState` | 躯干数据 |
| `left_arm` | `JointState` | 左臂数据 |
| `right_arm` | `JointState` | 右臂数据 |
| `head` | `JointState` | 头部数据 |

### wbc_state()

全身控制状态流。

```python
wbc_state(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `WbcState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `body_mode` | `BodyMode` | 躯干约束模式（`BodyMode`） |
| `head_mode` | `HeadMode` | 控制器 current_state 不回读头部模式；无观测时保持 DISABLE。 |
| `arms_mode` | `ArmsMode` | 双臂耦合模式（`ArmsMode`） |
| `left_arm_enabled` | `bool` | 左臂是否使能 |
| `right_arm_enabled` | `bool` | 右臂是否使能 |
| `chassis_locked` | `bool` | 底盘是否锁止 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |

### center_of_mass()

质心与稳定裕度流。

```python
center_of_mass(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `CenterOfMass`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `position` | `Vector3d` | 质心在 base_footprint 下的三维坐标，米。 |
| `status` | `SupportStatus` | 状态快照 |
| `min_safe_margin` | `float` | 相对支撑矩形的最小安全裕度，米 |
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

`move_home` / `move_preset` / `move_joint` / `move_joint_path` / `move_pose` 共用资源 `motion_controller`，策略 `queue`，默认时限 60 秒。
