---
title: 能力接口概述
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 能力接口概述

SDK 内置 15 个能力模块的类型化 Proxy。能力经 `Robot` 的槽位属性访问（`robot.<slot>`），槽位与模块的对应关系见 [Robot 入口](robot.md)。

## 模块清单

| 模块 | 能力 id | 文档 | 状态 |
|------|---------|------|------|
| Robot 入口 | — | [robot.md](robot.md) | ✅ 已补全（draft） |
| 文本目录 Catalogs（非能力） | — | [catalogs.md](catalogs.md) | ✅ 已补全（draft） |
| IO | `io` | [io.md](io.md) | ✅ 已补全（draft） |
| 面屏 | `screen` | [screen.md](screen.md) | ✅ 已补全（draft） |
| 底盘 | `chassis` | [chassis.md](chassis.md) | ✅ 已补全（draft） |
| 运动 | `motion` | [motion.md](motion.md) | ✅ 已补全（draft） |
| 机械臂 | `arm` | [arm.md](arm.md) | ✅ 已补全（draft，范例） |
| 双臂 | `arms` | [arms.md](arms.md) | ✅ 已补全（draft） |
| 躯干 | `body` | [body.md](body.md) | ✅ 已补全（draft） |
| 夹爪 | `gripper` | [gripper.md](gripper.md) | ✅ 已补全（draft） |
| 灵巧手 | `hand` | [hand.md](hand.md) | ✅ 已补全（draft） |
| 头部 | `head` | [head.md](head.md) | ✅ 已补全（draft） |
| 灯效 | `light` | [light.md](light.md) | ✅ 已补全（draft） |
| 电源 | `power` | [power.md](power.md) | ✅ 已补全（draft） |
| 遥操作 | `teleop` | [teleop.md](teleop.md) | ✅ 已补全（draft） |
| 语音 | `voice` | [voice.md](voice.md) | ✅ 已补全（draft） |
| 相机 | `camera` | [camera.md](camera.md) | ✅ 已补全（draft） |

## 统一的 Proxy 骨架

每个能力 Proxy 都有以下公共成员（各模块文档只列该能力特有的部分）：

| 成员 | 说明 |
|------|------|
| `slot_id` | 槽位 id |
| `has_adapter` | 是否已绑定 adapter |
| `as_adapter(...)` | 转为具体 adapter 的强类型视图（见 [配置管理](../../usage/configuration.md)） |
| `events` | 能力事件订阅入口（见 [事件与数据通道](../../usage/events-channels.md)） |
| `health()` | 健康状态 `SlotHealth` |
| `lifecycle()` | 生命周期快照 `CapabilityLifecycleSnapshot` |
| `faults()` | 当前故障列表 |

## 模块文档结构

每个模块文档按八段式组织：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源。
