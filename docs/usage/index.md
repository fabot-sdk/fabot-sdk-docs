---
title: 常规操作
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 常规操作

本节说明使用 fabot SDK 时贯穿各能力模块的通用机制：如何连接机器人、如何下发命令并跟踪长时操作、如何订阅事件与数据、如何读取状态与故障、如何处理错误，以及配置管理、Mock 测试与平台服务管理。

这些机制由 `Robot` 入口统一提供，对全部 15 个能力模块（arm、arms、body、camera、chassis、gripper、hand、head、io、light、motion、power、screen、teleop、voice）一致适用。各模块自身的 API 细节见 [Python API 参考](../reference/python/index.md)。

## 阅读顺序

建议按以下顺序阅读，先掌握模型与连接，再进入数据与运维类主题：

1. [连接与 Robot 入口](connection.md) — `Robot.connect` 及各类入口、`ClientOptions`、连接状态订阅、资源释放。
2. [命令与长时操作](commands-operations.md) — Command 即时下发、Operation 进度跟踪与取消的核心模型。
3. [事件与数据通道](events-channels.md) — 事件订阅（`EventHeader`、`SubscriptionToken`）与数据通道（帧迭代、QoS、续期与关闭）。
4. [状态、故障与生命周期](status-faults.md) — `robot.state()` 快照、状态袋、生命周期与健康状态机。
5. [错误处理](errors.md) — `FabotError` 错误层次、错误码与可重试性、Trace ID。
6. [Mock 测试](mock.md) — `Robot.mock()` 的离线开发与测试能力及限制。
7. [配置管理](configuration.md) — `robot.configuration` 的读取与下发、冲突处理与重试。
8. [平台服务管理](services.md) — `robot.services` 对平台服务的启停、配置与状态查询。

## 常见操作速查

- **建立连接并等待就绪**：`Robot.connect(...)` + `wait_ready()`，见[连接与 Robot 入口](connection.md)。
- **下发一个动作**：调用能力模块方法，按返回类型区分 Command 与 Operation，见[命令与长时操作](commands-operations.md)。
- **监听传感器/状态事件**：`subscribe` 对应事件，回调中读取 `EventHeader`，见[事件与数据通道](events-channels.md)。
- **拉取相机等数据流**：打开数据通道并迭代帧，用完关闭或续期，见[事件与数据通道](events-channels.md)。
- **检查机器人当前状态**：`robot.state()` / 各模块 `status()`，见[状态、故障与生命周期](status-faults.md)。
- **捕获并分类错误**：按 `FabotError` 层次捕获，判断 `retryable` 后用 `trace_id` 排查，见[错误处理](errors.md)。
- **无真机开发联调**：`Robot.mock()`，见[Mock 测试](mock.md)。
