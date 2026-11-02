---
title: 更新日志
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 更新日志

按 SDK 版本倒序列出对外可见的变更。每个版本与同版本号的机器人平台配套；版本号语义与升级步骤见 [版本配套](install/compatibility.md)。

顶栏版本下拉可切换各版本对应的文档；某个历史版本的更新日志只包含到该版本为止的条目。

## 1.1.0

2026-11-02 · 当前开发版

### 新增

- 日志：`robot.logs.history()` 查询历史日志（`limit` / `slot` / `unit` 过滤），`robot.logs.emit()` / `debug` / `info` / `warn` / `error` 上报自定义日志，`robot.logs.freeze()` 冻结飞行记录器，见 [日志、指标与可观测性](usage/observability.md)。
- 指标：`robot.metrics` 全新入口——`subscribe()` 订阅、`snapshot()` 读 SDK 自身计数、`records()` 导出为 `MetricRecord`，`gauge` / `counter` / `histogram` 上报自定义指标。
- 坐标系：`robot.frames`（`FrameSystem`）提供 `lookup` / `transform` / `transform_points` / `lookup_full` / `scoped_frame`，配套 `Transform3d` 代数与像素几何函数，不依赖 ROS，见 [坐标系与变换](usage/frames.md)。
- 事件：`robot.events.emit()` 向事件总线上报自定义事件；`robot.events.subscribe()` 支持 `name` / `slot` 过滤。
- 技能：新增 `robot.skills.camera_sync`（多相机时间配对）与 `robot.skills.voice_aiui`（转写、意图与语义播报），见 [技能与扩展](usage/skills.md)。
- 遥测：`robot.ping()` 探测运行库往返时延，槽位 Proxy 上也有同名方法。

### 变更

- 状态模型：`RobotState` 拆分为 `mode`（`RobotMode`）与 `health`（`HealthState`）两条独立的轴，新增 `root_causes`（`DiagnosticReason`）与 `domains`（`DomainHealth`），并提供 `is_normal` / `is_fatal` 等便捷属性。原 `.state` / `.reasons` 写法不再适用。
- 故障：故障袋统一为 `Faults(revision, records: list[FaultState])`，`FaultState` 由 `code`（诊断码）/ `source` / `state` / `severity` / `timestamp_us` 组成，替代按名称展开的字段。
- 错误：`FabotError` 以 32 位诊断码为主标识，`category` 只在本地构造期用于选择子类、不随协议传递；`retryable` 由子类推导（`Timeout` / `ResourceConflict` / `TransportError` / `Unavailable`）。
- 文本目录：`Catalogs` 改为按诊断码 `0xXXXXXXXX` 查表，新增 `format_metric`；`format_fault` 不再需要 `capability_id`。
- 相机：`capture()` 返回完整的 `FrameSet`（彩色 / 深度 / 配准深度 / 红外 / 置信度），新增 `get_calibration()`（含内外参、基线与深度换算）、`get_imaging()` / `set_imaging()`、`trigger()`、`perf_frame_shm()`，通道从 5 条扩到 12 条。能力激活后默认自动开流。
- 底盘：`servo_twist` / `move_pose` / `move_pose_relative` / `move_station` 取代原 `move` / `move_relative` / `navigate_to_station` / `stop` / `pause` / `resume`；`get_station()` 取代 `list_stations()`；新增 `set_pose`（重定位）、`get_twist` / `get_stage`、驻停 / 锁止 / 暂停读写与速度加速度上限。
- 机械臂 / 双臂 / 躯干 / 头部：运动接口统一为 `move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center`；`servo_pose` / `servo_twist` 为短周期伺服；新增到达阈值与速度 / 加速度上限读写。
- 运动：以 `get_mode` / `set_mode`（`MotionMode`）取代 FSM 接口，新增 `get_wbc_state` / `get_center_of_mass` / `move_home` / `move_preset` 与全身关节 / 位姿目标。
- 夹爪 / 灵巧手：开合度用归一化 [0, 1]；速度与力上限改为持久设置；灵巧手新增五指触觉阵列与 `tactile()` 通道。
- 语音：硬件能力聚焦采集与播放（`listen` / `play_audio` / `begin_playback` / `write_audio` 与三条通道），语义功能迁到 `voice_aiui` 技能。
- 灯效：`set_mode` 增加 `target_light`，`LightStatus` 字段改为 `period_ms` / `led_count`。
- 配置：能力 / 技能配置域改为 `get_config()` / `set_config()` / `edit_config()`，整机绑定走 `robot.configuration`；`edit_config()` 只提交变化的域。

### 兼容性

- **破坏性变更**：状态模型、故障结构、参数名（`positions` → `get_joint().positions`、`wait` → `duration` / `wait_timeout` 等）与多数运动方法名都与 1.0.x 不同。1.0.x 的应用代码需要按参考页逐项迁移。
- 线协议仍为 `fabot/v1`，SDK 与平台仍按同版本号配套；建议升级两端后再改代码。

## 1.0.2

2026-10-23 · 里程碑版本

### 新增

- 相机：新增 `get_intrinsics()`，读取彩色 / 深度两路内参（K 与畸变，不含外参），见 [相机 Camera](reference/python/camera.md)。
- 槽位：新增 `robot.waist_camera`；相机槽位由 4 个增至 5 个，整机槽位由 22 个增至 23 个，见 [Robot 入口](reference/python/robot.md#slots)。
- 服务：新增 `robot.services.orbbec_sdk_ros2`（Orbbec ROS 相机后端，默认不启动），见 [平台服务管理](usage/services.md)。

### 兼容性

- 无破坏性变更：`fabot/v1` 接口保持兼容，1.0.0 / 1.0.1 的应用代码可继续运行。

## 1.0.1

2026-09-21 · 仅运行时修复

- SDK 公开接口无变化；机器人端修复了运行库隔离问题，避免与系统中其它版本的通信库冲突。
- 仍建议把 SDK 升到 1.0.1，保持两端版本一致，见 [版本配套](install/compatibility.md)。

## 1.0.0

2026-09-17 · 首个正式版

- 首次对外发布的 `fabot-sdk`（import 名 `fabot`）：15 个能力模块、22 个槽位、`fabot/v1` 接口，要求 Python ≥ 3.12。
- 运行时依赖按精确版本锁定，见 [安装 Python SDK](install/python.md) 的依赖表。
- 从零开始建议先看 [第一个程序（Python）](tutorials/python.md)。
