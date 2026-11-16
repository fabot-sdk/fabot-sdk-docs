---
title: 从 1.0.x 迁移到 1.1.0
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 从 1.0.x 迁移到 1.1.0

1.1.0 是一次破坏性更新：状态模型、故障结构、方法名与配置接口都变了。本页给出旧→新对照、典型改造与一份可以直接在代码里搜的检查清单。版本号语义与升级步骤见 [版本配套](../install/compatibility.md)。

## 30 秒判断要不要迁移

如果代码里出现下面任意一项，就会在 1.1.0 上直接抛 `AttributeError` / `TypeError`：

| 旧写法 | 新写法 |
|--------|--------|
| `robot.state().state` | `robot.state().mode`（`RobotMode`） |
| `robot.state().reasons` | `robot.state().root_causes`（`list[DiagnosticReason]`） |
| `robot.status().screen.activity` 之外还期望 `power` 之外的状态 | 状态袋扩到相机与升降柱；未提供 `status()` 的能力字段保持默认值 |
| `robot.<slot>.faults()` 里按名字展开的字段 | `Faults(revision, records: list[FaultState])` |
| `Catalogs.format_fault(record, capability_id=...)` | `Catalogs.format_fault(record)` |
| `get_joints()` / `move_joints()` | `get_joint()` / `move_joint()` |
| `move(...)` / `move_relative(...)` | `servo_twist(...)` / `move_pose_relative(...)` |
| `navigate_to_station(...)` / `list_stations()` | `move_station(...)` / `get_station()` |

## 符号对照表

### 状态与故障

| 1.0.x | 1.1.0 | 语义差异 |
|-------|-------|----------|
| `RobotState.state`（`RobotRunState`） | `RobotState.mode`（`RobotMode`） | 运行模式与健康度拆成两条轴 |
| — | `RobotState.health`（`HealthState`） | 新增；由故障与自检驱动 |
| `RobotState.reasons: list[str]` | `RobotState.root_causes: list[DiagnosticReason]` | 从字符串变为带 `code` / `source` 的结构 |
| — | `RobotState.domains: list[DomainHealth]` | 新增按域聚合 |
| `is_running` / `is_idle` / `is_degraded` / `is_fault` / `is_estopped` | `is_running` / `is_idle` / `is_estopped`（模式） + `is_normal` / `is_degraded` / `is_fault` / `is_fatal`（健康） | 便捷属性按轴拆分 |
| 能力 `faults()` 的展开字段 | `Faults.revision` + `Faults.records: list[FaultState]` | 统一为记录列表；单条含 `code` / `source` / `state` / `severity` / `timestamp_us` |
| `format_fault(record, capability_id=...)` | `format_fault(record)` | 诊断码本身已唯一 |

### 底盘（chassis）

| 1.0.x | 1.1.0 |
|-------|-------|
| `move(vx=..., vy=..., vtheta=...)` | `servo_twist(vx=..., vy=..., vtheta=...)` |
| `move_relative(dx=, dy=, dtheta=)` | `move_pose_relative(Pose2d(...))` |
| `navigate_to_station(station_id=, mode=)` | `move_station(station_id, mode=...)` |
| `list_stations()` | `get_station()` |
| `relocalize(pose=...)` | `set_pose(x=, y=, theta=)` |
| `set_max_speed(linear=, angular=)` / `get_max_speed()` | `set_linear_velocity_limit()` / `set_angular_velocity_limit()` 及对应 `get_*` |
| `set_max_acceleration(...)` | `set_linear_acceleration_limit()` / `set_angular_acceleration_limit()` |
| `get_status()` | `get_pose()` / `get_twist()` / `get_stage()` / `get_odometer()` 组合 |
| `pause()` / `resume()` | `set_pause(paused=...)` |
| `stop()` | 保留 `stop()` |

### 机械臂 / 躯干 / 头部 / 双臂

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_joints()` | `get_joint()`（返回 `JointState`） |
| `move_joints(positions, wait=...)` | `move_joint(JointPositions(...), duration=, wait_timeout=)` |
| `smooth_move_pose(pose, wait=, frame_id=)` | `move_pose(pose, end_frame=, duration=, wait_timeout=)` |
| `direct_move_pose(pose)` | `servo_pose(pose)`（短周期） |
| `set_enabled(enabled)` | `set_enable(enabled)` |
| `get_move_duration()` / `set_move_duration()` | 去掉；改用各 `move_*` 的 `duration` 参数 |
| `check_arrive()` | 去掉；用 `get_arrival_thresholds()` / 到位等待参数 |
| `lift_waist()` / `turn_waist()` / `move_waist()` | `move_waist(WaistPose(...))` / `move_waist_relative(...)` 或 `servo_waist_twist(...)` |

### 夹爪 / 灵巧手

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_joints()` | `get_joint()` / `get_opening()` |
| `move_joints(...)` | `move_joint(...)` / `move_opening(target)` |
| `get_velocity()` / `set_velocity()` | `get_velocity_limit()` / `set_velocity_limit()` |
| `get_torque()` / `set_torque()` | `get_force_limit()` / `set_force_limit()` |

夹爪与灵巧手的开合度统一为归一化 `[0, 1]`。

### 运动（motion）

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_fsm_state()` / `set_fsm_state()` / `reset_fsm()` | `get_mode()` / `set_mode(MotionMode)` |
| `get_joints()` / `stop()` | `get_joint()`；停止改用 `robot.estop` 或具体能力的 `stop()` |
| — | `get_wbc_state()` / `get_center_of_mass()` / `move_home()` / `move_preset()` |

### 相机

| 1.0.x | 1.1.0 |
|-------|-------|
| `capture()` / `capture_color()` / `capture_depth()` | `capture(streams=[...])` 返回 `FrameSet` |
| `get_intrinsics()` | `get_calibration()`（`get_intrinsics` 是别名） |
| 5 条通道 | 12 条通道（新增配准深度、左右红外、置信度、点云、IMU、预览） |

### 语音 / 灯效 / 配置

| 1.0.x | 1.1.0 |
|-------|-------|
| `voice.speak()` / `transcript()` / `intent()` | 语义能力迁到 `robot.skills.voice_aiui`；硬件侧保留 `listen()` / `play_audio()` |
| `voice.set_speaker()` / `list_speakers()` / `set_speaking_rate()` | 迁到 `skills.voice_aiui` |
| `light.set_mode(mode=...)` | `light.set_mode(mode, color=..., target_light=...)` |
| `LightStatus` 的旧字段 | `period_ms` / `led_count` |
| 能力配置散在多种 setter | `get_config()` / `set_config()` / `edit_config()` 统一配置域 |

## 典型改造

### 1. 状态判断

```python
# 1.0.x
st = robot.state()
if st.is_degraded:
    print(st.reasons)
```

```python
# 1.1.0
st = robot.state()
if st.is_degraded:
    for cause in st.root_causes:
        print(hex(cause.code), cause.source)
```

### 2. 运动下发

```python
# 1.0.x
robot.left_arm.move_joints(positions, wait=True)
robot.chassis.move(vx=0.2, vy=0.0, vtheta=0.1)
```

```python
# 1.1.0
from fabot.types import JointPositions

robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0).wait(timeout=10.0)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
```

### 3. 故障展示

```python
# 1.0.x
print(catalogs.format_fault(record, capability_id="chassis"))

# 1.1.0
for record in robot.faults().chassis.records:
    print(hex(record.code), catalogs.format_fault(record))
```

## 迁移检查清单

在自己仓库里搜这些字符串，逐条对照上面的表：

```console
$ grep -rn "\.state\.state\|\.reasons\b\|get_joints\|move_joints\|set_enabled\|smooth_move_pose\|direct_move_pose\|navigate_to_station\|list_stations\|get_fsm_state\|set_fsm_state\|reset_fsm\|capture_color\|capture_depth\|set_max_speed\|set_max_acceleration\|format_fault(.*capability_id" .
```

再确认三件事：

1. `fabot.__version__` 与 `robot.version()` 都已是 1.1.0（见 [版本配套](../install/compatibility.md)）；
2. 所有 `except` 分支不再依赖 `message` 文本，而是看 `code` / 类别（见 [错误处理](errors.md)）；
3. 自定义 UI 里的状态/故障字段已改成新结构。

## 兼容性边界

- 线协议仍是 `fabot/v1`，但 Python 层 API 不保证向后兼容；1.0.x 的应用代码必须按本页改造。
- 1.0.1 与 1.0.0 的公开接口一致，差异只在机器人端运行时修复，所以从 1.0.0 或 1.0.1 迁移的改造项相同。
- 迁移完成后建议跑一遍 [第一个程序（Python）](../tutorials/python.md) 与 [Mock 测试](mock.md)，确认连接、状态与错误路径都正常。
