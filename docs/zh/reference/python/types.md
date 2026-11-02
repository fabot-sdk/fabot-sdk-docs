---
title: 通用类型与枚举
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 通用类型与枚举

能力方法在请求与响应里复用的数据类型都定义在 `fabot.types`（可从 `fabot` 顶层导入）。它们是 FlatBuffers 对象 API 的 dataclass，字段用小写下划线写法，同时接受原样的驼峰别名（如 `frame_id` ↔ `frameId`）。

## 几何与运动类型

| 类型 | 字段 | 说明 |
|------|------|------|
| `Pose3d` | `x` / `y` / `z`（米）、`qx` / `qy` / `qz` / `qw`、`frame_id`、`stamp_ns` | 三维位姿；`frame_id` 空串在命令里表示槽位缺省基准，`stamp_ns=0` 表示最新 |
| `Pose2d` | `x` / `y`（米）、`theta`（弧度）、`frame_id`、`stamp_ns` | 平面位姿 |
| `PoseQuery` | `frame_id` / `end_frame` | 位姿查询的参考系与受控末端 |
| `Point3d` | `x` / `y` / `z`（米） | 三维点 |
| `Quaterniond` | `qx` / `qy` / `qz` / `qw` | 四元数 |
| `Vector2d` | `x` / `y` | 二维向量 |
| `Vector3d` | `x` / `y` / `z` | 三维向量 |
| `Twist2d` | `vx` / `vy`（米/秒）、`vtheta`（弧度/秒） | 平面速度 |
| `Twist3d` | `linear` / `angular`（`Vector3d`） | 空间速度：米/秒与弧度/秒 |
| `Wrench3d` | `force` / `torque`（`Vector3d`） | 六维力：牛与牛·米 |
| `Transform3d` | `target_frame` / `source_frame` / `tx` / `ty` / `tz` / `qx`…`qw` / `stamp_ns` | 刚体变换 `^target T_source` |
| `PoseArcByPoints` | `via` / `end` | 三点圆弧（起点为当前位姿） |
| `PoseArcByCenter` | `center` / `axis` / `angle` / `end_orientation` | 圆心圆弧 |

`Pose3d` 还有若干便捷成员：`position` / `quaternion` / `euler_rpy` / `to_matrix()` / `to_transform()`，以及 `from_euler()` / `from_matrix()` 等构造器。`Transform3d` 的完整代数见 [坐标系与变换](../../usage/frames.md)。

## 关节与容器类型

| 类型 | 字段 | 说明 |
|------|------|------|
| `JointPositions` | `positions: list[float]` | 关节角，弧度 |
| `JointState` | `positions` / `velocities` / `efforts` / `stamp_ns` | 一次关节采样；三个数组长度一致 |
| `Doubles` | `values: list[float]` | 标量数组；**缺省该表与空数组含义不同** |
| `Rgb8` | `r` / `g` / `b` | 颜色，各 0–255 |
| `Empty` | — | 空请求 |

## 结果与进度

| 类型 | 字段 | 说明 |
|------|------|------|
| `Outcome` | `success: bool`、`status_message: str` | Command 或 Operation 的执行结果 |
| `Progress` | `progress: float`（0–1）、`status_message: str` | Operation 进度反馈 |

## 标量与字节

`Bool` / `Int32` / `Int64` / `UInt32` / `UInt64` / `Float32` / `Float64` / `String` / `Bytes` 都是只有 `value` 一个字段的包装表。`KeyValue` 是 `key` / `value` 字符串对。`SharedMemoryHandle` 描述一块共享内存（`region` / `generation` / `offset` / `length` / `capacity` / `schema`）。

:::note 为什么用包装表
协议要求所有根类型都是 table，所以单个标量也要包一层。SDK 的产品层方法通常直接用 Python 标量（如 `set_volume(0.7)`），包装表出现在字段与响应对象里。
:::

## 核心层类型

`fabot.core` 里还导出一批传输层类型，日常使用多为间接接触：

| 类型 | 说明 |
|------|------|
| `RobotState` / `RobotMode` / `HealthState` / `LifecycleState` | 整机状态与健康度，见 [状态、故障与生命周期](../../usage/status-faults.md) |
| `OperationState` / `OperationSnapshot` | Operation 状态与快照 |
| `LogLevel` / `LogRecord` / `LogIdentity` | 日志，见 [日志、指标与可观测性](../../usage/observability.md) |
| `MetricType` / `MetricRecord` / `MetricValue` / `MetricIdentity` / `SdkMetricSnapshot` | 指标 |
| `FreezeRequest` / `PingReport` / `PingSample` | 冻结与往返时延探测 |
| `QosProfile` / `SubscribeOptions` / `ChannelDescriptor` / `ChannelFrame` | 通道订阅 |
| `ClientConfig` / `ClientOptions` / `CallOptions` | 客户端选项，见 [连接与 Robot 入口](../../usage/connection.md) |
| `ConfigState` / `SlotRuntime` / `ServiceState` | 配置与服务状态 |

## 能力私有类型

各能力自己的请求 / 响应表定义在 `fabot.capabilities.<cap>` 下（如 `fabot.capabilities.arm.PoseMove`、`fabot.capabilities.camera.CaptureOptions`），字段说明见对应能力参考页。

## 枚举速查

| 枚举 | 取值 | 文档 |
|------|------|------|
| `PinDirection` | `INPUT` / `OUTPUT` | [IO](io.md) |
| `LightMode` | `OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE` | [灯效](light.md) |
| `ChassisMode` / `NavigationMode` / `ChassisStage` | 见文档 | [底盘](chassis.md) |
| `ArmsMode` / `ImpedanceMode` | `INDEPENDENT` / `COUPLED`、`DISABLED` / `LOW` / `HIGH` | [双臂](arms.md) |
| `BodyMode` / `HeadMode` | 见文档 | [躯干](body.md) / [头部](head.md) |
| `MotionMode` / `HomePose` / `SupportStatus` | 见文档 | [运动](motion.md) |
| `StreamKind` / `PixelFormat` / `RegistrationMode` / `FrameTransportHint` | 见文档 | [相机](camera.md) |
| `CaptureEnd` / `PlaybackState` | 见文档 | [语音](voice.md) |

枚举值在 SDK 里是整型常量（定义在对应能力的 `types` 模块），`LightMode` 等部分枚举同时提供名称常量，可直接与整数比较。
