---
title: 常规操作
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 常规操作

本节说明使用 fabot SDK 时贯穿各能力模块的通用机制：如何连接机器人、如何下发命令并跟踪长时操作、如何订阅事件与数据、如何读取状态与故障、如何处理日志与指标、如何在坐标系之间换算、如何处理错误与本地化展示文本，以及配置管理、技能、Mock 测试与平台服务管理。

这些机制由 `Robot` 入口统一提供，对全部 15 个能力模块（arm、arms、body、camera、chassis、gripper、hand、head、io、light、motion、power、screen、teleop、voice）一致适用。各模块自身的 API 细节见 [Python API 参考](../reference/python/index.md)。

## 阅读顺序

建议按以下顺序阅读，先掌握模型与连接，再进入数据与运维类主题：

1. [连接与 Robot 入口](connection.md) — `Robot.connect` 及各类入口、`ClientOptions`、连接状态订阅、资源释放。
2. [命令与长时操作](commands-operations.md) — Command 即时下发、Operation 进度跟踪、取消与资源排队策略。
3. [事件与数据通道](events-channels.md) — 事件订阅（`EventHeader`、`SubscriptionToken`）与数据通道（帧迭代、QoS、续期与关闭）。
4. [状态、故障与生命周期](status-faults.md) — `robot.state()` 的运行模式与健康度、状态袋、生命周期与健康、故障袋。
5. [日志、指标与可观测性](observability.md) — 日志订阅与历史、自定义日志 / 指标上报、冻结飞行记录器。
6. [坐标系与变换](frames.md) — `robot.frames` 的坐标查询、位姿与点云变换、像素反投影。
7. [错误处理](errors.md) — `FabotError` 错误层次、诊断码与可重试性、Trace ID。
8. [文本目录 Catalogs](catalogs.md) — 用嵌入的文本表把诊断码、日志键与指标名格式化成展示文案。
9. [配置管理](configuration.md) — 整机绑定与能力 / 技能配置域的读写、CAS 冲突处理。
10. [技能与扩展](skills.md) — `robot.skills` 的多相机同步与语音语义能力。
11. [Mock 测试](mock.md) — `Robot.mock()` 的离线开发与测试能力及限制。
12. [平台服务管理](services.md) — `robot.services` 对平台服务的启停、配置与状态查询。

## 常见操作速查

- **建立连接并等待就绪**：`Robot.connect(...)` + `wait_ready()`，见[连接与 Robot 入口](connection.md)。
- **下发一个动作**：调用能力模块方法，按返回类型区分 Command 与 Operation，见[命令与长时操作](commands-operations.md)。
- **监听状态变化**：`robot.events` / `robot.<slot>.events` 订阅对应事件，回调中读取 `EventHeader`，见[事件与数据通道](events-channels.md)。
- **拉取相机等数据流**：打开数据通道并迭代帧，用完关闭或续期，见[事件与数据通道](events-channels.md)。
- **检查机器人当前状态**：`robot.state()` / `robot.status()` / 各模块 `status()`，见[状态、故障与生命周期](status-faults.md)。
- **打日志、上指标、抓现场**：`robot.logs` / `robot.metrics` / `robot.freeze()`，见[日志、指标与可观测性](observability.md)。
- **在坐标系之间换算位姿或点云**：`robot.frames`，见[坐标系与变换](frames.md)。
- **捕获并分类错误**：按 `FabotError` 层次捕获，判断 `retryable` 后用 `trace_id` 排查，见[错误处理](errors.md)。
- **展示本地化文本**：`Catalogs.load()` 后 `format_error` / `format_log` / `format_fault` / `format_metric`，见[文本目录 Catalogs](catalogs.md)。
- **无真机开发联调**：`Robot.mock()`，见[Mock 测试](mock.md)。
