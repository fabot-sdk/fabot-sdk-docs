---
title: 能力接口概述
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 能力接口概述

SDK 内置 15 个能力模块的类型化 Proxy。能力经 `Robot` 的槽位属性访问（`robot.<slot>`），槽位与模块的对应关系见 [Robot 入口](robot.md)。

## 模块清单

| 模块 | 能力 id | 文档 |
|------|---------|------|
| Robot 入口 | — | [robot.md](robot.md) |
| 文本目录 Catalogs（非能力） | — | [catalogs.md](catalogs.md) |
| 坐标系 API（非能力） | — | [frames.md](frames.md) |
| 通用类型与枚举（非能力） | — | [types.md](types.md) |
| IO | `io` | [io.md](io.md) |
| 面屏 | `screen` | [screen.md](screen.md) |
| 底盘 | `chassis` | [chassis.md](chassis.md) |
| 运动 | `motion` | [motion.md](motion.md) |
| 机械臂 | `arm` | [arm.md](arm.md) |
| 双臂 | `arms` | [arms.md](arms.md) |
| 躯干 | `body` | [body.md](body.md) |
| 夹爪 | `gripper` | [gripper.md](gripper.md) |
| 灵巧手 | `hand` | [hand.md](hand.md) |
| 头部 | `head` | [head.md](head.md) |
| 灯效 | `light` | [light.md](light.md) |
| 电源 | `power` | [power.md](power.md) |
| 遥操作 | `teleop` | [teleop.md](teleop.md) |
| 语音 | `voice` | [voice.md](voice.md) |
| 相机 | `camera` | [camera.md](camera.md) |

技能（`robot.skills`）的接口见 [技能与扩展](../../usage/skills.md)。

## 统一的 Proxy 骨架

每个能力 Proxy 都有以下公共成员（各模块文档只列该能力特有的部分）：

| 成员 | 说明 |
|------|------|
| `slot_id` | 槽位 id |
| `handle` | 槽位句柄 `SlotHandle`（惰性解析） |
| `events` | 能力事件入口（`fault_changed` / `lifecycle_changed`，部分能力另有专属事件） |
| `has_adapter` | 是否已绑定 adapter |
| `as_adapter(...)` | 转为具体 adapter 的强类型视图 |
| `health()` | 健康状态 `SlotHealth` |
| `lifecycle()` | 生命周期快照 `CapabilityLifecycleSnapshot` |
| `faults()` | 当前故障袋 `Faults` |
| `ping(...)` | 运行库往返时延探测 `PingReport` |
| `get_config()` / `set_config(cfg)` / `edit_config()` | 该槽位配置域读写，见 [配置管理](../../usage/configuration.md) |

部分 Proxy 还有身份与坐标系属性：机械臂有 `side` / `base_frame` / `eef_frame` / `tcp_frame` / `ft_frame`；夹爪与灵巧手有 `side`；底盘有 `base_frame` / `map_frame` / `odom_frame`；躯干、头部、双臂有 `base_frame`（头部另有 `eef_frame`）；相机有 `color_frame` / `depth_frame` / `imu_frame`；电源有 `id`。

## 模块文档结构

每个模块文档按八段式组织：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源。

- **API 总览**列出全部 Command、Operation、通道与事件的名字、类型与说明。
- **方法**逐个给出签名块、参数表与返回字段表，签名与默认值直接取自 SDK 类型声明。
- **通道**逐个给出打开参数与帧 payload 字段。
- **异常**统一说明 `Faults` / `FaultState` 结构。
- **状态**说明该模块是否有 `status()` 状态袋，以及公共的 `health()` / `lifecycle()`。
- **资源**说明该模块的 Operation 占用哪些资源、排队还是拒绝。
