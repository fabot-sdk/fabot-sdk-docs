---
title: 常规操作总览
status: draft
owner: fabot-core
updated: 2026-11-20
---

# 常规操作总览

本节说明使用 fabot SDK 时贯穿各能力模块的通用机制，按主题分为五章：[基础机制](#基础机制)（连接、约定、命令与操作、并发安全）、[数据与状态](#数据与状态)（事件通道、状态故障、坐标系）、[错误与诊断](#错误与诊断)（错误处理、文本目录、自检、可观测性）、[配置、技能与服务](#配置技能与服务)（配置管理、技能、平台服务）、[测试、迁移与背景](#测试迁移与背景)（Mock、版本迁移、机器人系统）。

这些机制由 `Robot` 入口统一提供，对全部 16 个能力模块（arm、arms、body、camera、chassis、gripper、hand、head、io、lift、light、motion、power、screen、teleop、voice）一致适用。各模块自身的 API 细节见 [Python API 参考](../reference/python/index.md)。

## 章节导览

本章按主题组织，建议从「基础机制」开始按顺序阅读，再按需要进入其余四章：

### 基础机制

先跑通连接与约定，理解贯穿所有能力模块的调用与线程模型：

1. [连接与 Robot 入口](./basics/connection.md) — `Robot.connect` 及各类入口、`ClientOptions`、连接状态订阅、资源释放。
2. [时间基准与坐标系约定](./basics/conventions.md) — 单位、四元数顺序、`stamp_ns` 语义、时基与关节顺序。
3. [命令与长时操作](./basics/commands-operations.md) — Command 即时下发、Operation 进度跟踪、取消与资源排队策略。
4. [并发、线程与安全](./basics/concurrency-and-safety.md) — 线程模型、I/O 线程约束、伺服安全、幂等与重连。

### 数据与状态

如何从机器人持续获取数据并读取当前状态：

5. [事件与数据通道](./data/events-channels.md) — 事件订阅（`EventHeader`、`SubscriptionToken`）与数据通道（帧迭代、QoS、续期与关闭）。
6. [状态、故障与生命周期](./data/status-faults.md) — `robot.state()` 的运行模式与健康度、状态袋、生命周期与健康、故障袋。
7. [坐标系与变换](./data/frames.md) — `robot.frames` 的坐标查询、位姿与点云变换、像素反投影。

### 错误与诊断

出错时如何分类、定位与观测：

8. [错误处理](./diagnostics/errors.md) — `FabotError` 错误层次、诊断码与可重试性、Trace ID。
9. [文本目录 Catalogs](./diagnostics/catalogs.md) — 用嵌入的文本表把诊断码、日志键与指标名格式化成展示文案。
10. [自检](./diagnostics/self-check.md) — 槽位与整机的按需自检、报告结构、超时预算与汇总规则。
11. [日志、指标与可观测性](./diagnostics/observability.md) — 日志订阅与历史、自定义日志 / 指标上报、冻结飞行记录器与观测存储。

### 配置、技能与服务

12. [配置管理](./configuration/configuration.md) — 整机绑定与能力 / 技能配置域的读写、CAS 冲突处理。
13. [技能与扩展](./configuration/skills.md) — `robot.skills` 的多相机同步与语音语义能力。
14. [平台服务管理](./configuration/services.md) — `robot.services` / `robot.environments` 的启停、配置与状态查询。

### 测试、迁移与背景

15. [Mock 测试](./testing/mock.md) — `Robot.mock()` 的离线开发与测试能力及限制。
16. [从 1.0.x 迁移到 1.1.0](./testing/migration-1.0-to-1.1.md) — 从旧版本升级时的符号对照与检查清单。
17. [机器人系统运维与本地控制台](./testing/robot-system.md) — `fabot` 命令、`fabot console` 界面与服务启停；安装、升级与配置见入门章节。

## 常见操作速查

- **建立连接并等待就绪**：`Robot.connect(...)` + `wait_ready()`，见[连接与 Robot 入口](./basics/connection.md)。
- **下发一个动作**：调用能力模块方法，按返回类型区分 Command 与 Operation，见[命令与长时操作](./basics/commands-operations.md)。
- **监听状态变化**：`robot.events` / `robot.<slot>.events` 订阅对应事件，回调中读取 `EventHeader`，见[事件与数据通道](./data/events-channels.md)。
- **拉取相机等数据流**：打开数据通道并迭代帧，用完关闭或续期，见[事件与数据通道](./data/events-channels.md)。
- **检查机器人当前状态**：`robot.state()` / `robot.status()` / 各模块 `status()`，见[状态、故障与生命周期](./data/status-faults.md)。
- **打日志、上指标、抓现场**：`robot.logs` / `robot.metrics` / `robot.freeze()`，见[日志、指标与可观测性](./diagnostics/observability.md)。
- **在坐标系之间换算位姿或点云**：`robot.frames`，见[坐标系与变换](./data/frames.md)。
- **捕获并分类错误**：按 `FabotError` 层次捕获，判断 `retryable` 后用 `trace_id` 排查，见[错误处理](./diagnostics/errors.md)。
- **展示本地化文本**：`Catalogs.load()` 后 `format_error` / `format_log` / `format_fault` / `format_metric`，见[文本目录 Catalogs](./diagnostics/catalogs.md)。
- **无真机开发联调**：`Robot.mock()`，见[Mock 测试](./testing/mock.md)。
- **在现场启停机器人系统或看浏览器界面**：`fabot start` / `stop` / `status` / `enable` / `disable` 与 `fabot console`，见[机器人系统运维与本地控制台](./testing/robot-system.md)；安装、升级与配置见[机器人系统安装与升级](../getting-started/install/robot-system.md)与[机器人系统配置](../getting-started/install/robot-system-config.md)。
