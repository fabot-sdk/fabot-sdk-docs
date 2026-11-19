---
title: 参考总览
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 参考总览

本参考区覆盖 SDK 的全部公开 Python 接口，分三类入口：

| 入口 | 形态 | 数量 | 访问方式 |
|------|------|------|----------|
| 能力 Capability | 机器人上的领域功能单元，装在槽位（Slot）上 | 16 个模块 / 24 个槽位 | `robot.<slot>` |
| 技能 Skill | 跨多个能力组合出的高层语义单元 | 2 个 | `robot.skills.<name>` |
| 平台服务 Service | 机器人上的常驻进程，只开放启停与配置 | 2 个 + 1 个运行环境 | `robot.services.<name>` / `robot.environments.ros2` |

外加不占槽位的整机入口：`Robot` 本身（连接、状态、急停、日志、指标、事件、坐标系、整机配置），以及两个纯客户端工具——文本目录 `Catalogs` 与坐标系 API。

## 按需求找页面

| 你要做的事 | 去看 |
|------------|------|
| 建连接、设超时、等槽位就绪 | [Robot 入口](./robot.md) |
| 查某能力有哪些方法、参数默认值、返回字段 | 下表的对应模块页 |
| 分清 Command / Operation / 通道 / 事件的用法 | [命令与长时操作](../../usage/basics/commands-operations.md)、[事件与数据通道](../../usage/data/events-channels.md) |
| 多相机按时间戳取同一时刻的帧集 | [多相机同步 CameraSync](./skills/camera_sync.md) |
| 语音转写、意图识别、合成播报 | [语音语义 VoiceAiui](./skills/voice_aiui.md) |
| 启停 ROS 2 服务、调图访问与动作 | [ROS 2 服务 Ros2](./services/ros2.md) |
| 改观测数据的配额与保留策略 | [观测采集 ObsCollector](./services/obs_collector.md) |
| 改 ROS 2 domain id / 路由器归属 | [运行环境配置 Ros2Environment](./services/ros2_environment.md) |
| 把诊断码翻译成人话 | [诊断码参考](./error-codes.md)、[文本目录 Catalogs](./catalogs.md) |
| 写坐标变换、查询外参 | [坐标系 API](./frames.md)、[坐标系与变换](../../usage/data/frames.md) |
| 拼装 `Pose3d` / `Twist3d` / `JointPositions` 等请求体 | [通用类型与枚举](./types.md) |

## 能力模块清单

能力经 `robot` 的槽位属性访问。同一能力可装在多个槽位上（左右臂、双电源、五路相机），每个槽位是同一套 API 的独立实例。`robot.slots` 是以槽位 id 为键的字典，值与槽位属性是同一批对象。

### 运动与执行

| 模块 | 槽位 | 能力 id | 能力域 | 覆盖内容 |
|------|------|---------|--------|----------|
| [运动 Motion](./motion.md) | `robot.motion` | `motion` | `motion` | 全身运动体制、全身关节 / 位姿目标、回零与预设 |
| [底盘 Chassis](./chassis.md) | `robot.chassis` | `chassis` | `motion` | 速度伺服、地图导航、站点导航与驻停 / 锁止 |
| [机械臂 Arm](./arm.md) | `robot.left_arm` / `robot.right_arm` | `arm` | `motion` | 单臂关节运动、末端位姿、六维力与柔顺控制 |
| [双臂 Arms](./arms.md) | `robot.arms` | `arms` | `motion` | 双臂耦合、导纳拖拽与同步轨迹 |
| [躯干 Body](./body.md) | `robot.body` | `body` | `motion` | 躯干关节运动、腰部位姿与速度伺服 |
| [头部 Head](./head.md) | `robot.head` | `head` | `motion` | 头部俯仰 / 偏航、位姿运动与约束模式 |
| [夹爪 Gripper](./gripper.md) | `robot.left_gripper` / `robot.right_gripper` | `gripper` | `motion` | 开合度、速度 / 力上限与伺服 |
| [灵巧手 Hand](./hand.md) | `robot.left_hand` / `robot.right_hand` | `hand` | `motion` | 多指开合度、关节与触觉阵列 |
| [遥操作 Teleop](./teleop.md) | `robot.teleop` | `teleop` | `motion` | 手柄遥操作会话的建立与停止 |
| [升降柱 Lift](./lift.md) | `robot.lift` | `lift` | `motion` | 高度读写、绝对 / 相对运动、回零与伺服 |

### 感知

| 模块 | 槽位 | 能力 id | 能力域 | 覆盖内容 |
|------|------|---------|--------|----------|
| [相机 Camera](./camera.md) | `robot.head_camera` / `robot.chest_camera` / `robot.waist_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera` | `camera` | `perception` | 抓拍、标定、成像控制与 12 路数据流 |

### 人机交互与硬件

| 模块 | 槽位 | 能力 id | 能力域 | 覆盖内容 |
|------|------|---------|--------|----------|
| [语音 Voice](./voice.md) | `robot.voice` | `voice` | `interaction` | 麦克风采集、扬声器播放、音量与唤醒词 |
| [面屏 Screen](./screen.md) | `robot.screen` | `screen` | `screen` | 面屏文本 / 图片 / 视频显示 |
| [灯效 Light](./light.md) | `robot.light` | `light` | `light` | 灯带模式、颜色、亮度与动画周期 |
| [电源 Power](./power.md) | `robot.power_1` / `robot.power_2` | `power` | `power` | 电量、电压、电流、温度与充电状态 |
| [IO](./io.md) | `robot.io` | `io` | `io` | GPIO 线占用、释放、电平读写与芯片枚举 |

## 技能与平台服务

这两类入口不在槽位体系里，形态与能力 Proxy 相近但不经槽位解析。各自有一页概览加每实体一章。

| 入口 | 实体 | 章节 |
|------|------|------|
| 技能 Skills | `camera_sync`（多相机同步）/ `voice_aiui`（语音语义） | [技能概览](./skills/index.md) |
| 平台服务 Services | `ros2`（ROS 2 图访问）/ `obs_collector`（观测采集） | [平台服务概览](./services/index.md) |
| 运行环境 | `ros2`（domain id / 本机隔离 / 路由器） | [运行环境配置 Ros2Environment](./services/ros2_environment.md) |

技能是否部署由机器人配置决定，先读 `is_available` 再调用其余成员，见 [技能与扩展](../../usage/configuration/skills.md)；服务的管理约定见 [平台服务管理](../../usage/configuration/services.md)。

## 统一的 Proxy 骨架

每个能力 Proxy 都有下列公共成员，因此各模块页只写该能力特有的部分。技能 Proxy 是其中的子集（没有 `as_adapter` 意义上的能力 adapter 语义，但仍可读写自己的配置域）。

**身份与句柄**

| 成员 | 说明 |
|------|------|
| `slot_id` | 槽位 id，如 `"left_arm"` |
| `handle` | 槽位句柄 `SlotHandle`，惰性解析；未绑定时访问会抛错 |

**健康与生命周期**

| 成员 | 说明 |
|------|------|
| `health()` | 健康状态 `SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed`） |
| `lifecycle()` | 生命周期快照 `CapabilityLifecycleSnapshot` |
| `faults()` | 当前故障袋 `Faults`（`revision` + `records`） |
| `self_check(...)` | 主动执行该槽位自检，返回 `SelfCheckReport`；会写入故障锁存，见 [自检](../../usage/diagnostics/self-check.md) |
| `ping(...)` | 运行库往返时延探测 `PingReport` |

**事件**

| 成员 | 说明 |
|------|------|
| `events.fault_changed` | 故障集合变化，payload 为 `Faults` |
| `events.lifecycle_changed` | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot` |
| `events.subscribe(cb)` | 通配订阅该槽位的全部事件 |

部分能力另有专属事件（如 `camera` 的 `camera_session_changed`、`lift` 的 `lift_state_changed`），见各模块页。

**配置与 adapter**

| 成员 | 说明 |
|------|------|
| `has_adapter` | 是否已绑定 adapter |
| `as_adapter(type)` | 转为具体 adapter 的强类型视图，取适配器私有扩展 |
| `get_config()` | 读该槽位配置域，返回强类型 dataclass |
| `set_config(cfg)` | CAS 提交，冲突抛 `ConfigurationConflict` |
| `edit_config()` | 上下文管理器，退出时只提交变化的域 |

规则见 [配置管理](../../usage/configuration/configuration.md)。部分 Proxy 还有身份与坐标系属性：机械臂有 `side` / `base_frame` / `eef_frame` / `tcp_frame` / `ft_frame`；夹爪与灵巧手有 `side`；底盘有 `base_frame` / `map_frame` / `odom_frame`；躯干、头部、双臂有 `base_frame`（头部另有 `eef_frame`）；相机有 `color_frame` / `depth_frame` / `imu_frame`；电源有 `id`。

## 模块页怎么读

每个模块页固定八段：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源。

- **模块概述**给能力 id、槽位、能力域，以及该模块的一句话定位与关键单位。
- **API 总览**是索引表，列出全部 Command / Operation / 通道 / 事件及其默认超时，先在这里定位名字。
- **方法**逐个给出签名块、参数表与返回字段表。签名与默认值直接取自 SDK 类型声明，是**权威来源**；参数默认值、关键字限制以签名块为准。
- **通道**逐个给出打开参数与帧 payload 字段。
- **事件**列出该模块的专属事件与两个公共事件。
- **异常**统一说明 `Faults` / `FaultState` 结构，部分模块附常见故障码。
- **状态**说明该模块是否有 `status()` 状态袋及其字段，以及公共的 `health()` / `lifecycle()`。
- **资源**说明该模块的 Operation 占用哪些资源，排队（`queue`）还是拒绝（`reject`）。

字段名一律用下划线写法（`frame_id`、`group_id`）；生成类型同时接受原样的驼峰别名（`frameId`），两者等价。

## 文档对应的 SDK 基线

本站对应 **fabot-sdk 1.1.0-alpha.1**。当页面描述与已安装的包不一致时，以已安装的包为准：先看 `fabot.__version__` 与 `robot.sdk_version`，再查 [版本配套](../../getting-started/install/compatibility.md)。

新增或调整接口后，可运行 `npm run check:api` 校验文档里出现的每个 `robot.*` 调用名在 `Robot.mock()` 上确实存在。
