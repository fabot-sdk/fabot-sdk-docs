---
title: Robot 入口
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Robot 入口

`Robot` 是 Python SDK 的统一入口：建立连接、按槽位暴露能力 Proxy、聚合整机急停、事件与状态。概念说明见 [连接与 Robot 入口](../../usage/connection.md)。

## connect

`Robot.connect` / `from_endpoint` / `from_config` 建立连接；`close()` 或 `with` 上下文关闭。

!!! todo
    待按 `fabot` 包类型提示补全签名、参数与错误行为。

## wait_ready

`wait_ready(slots=None)` 阻塞等待指定槽位（默认全部）可用。

!!! todo
    待按 `fabot` 包类型提示补全超时、部分槽位与失败语义。

## slots

能力以只读属性按槽位暴露（`robot.io`、`robot.chassis` 等），共 22 个槽位。

!!! todo
    补槽位表、`has_adapter` / `AdapterUnbound` 与 `as_adapter` 用法。

## estop

`robot.estop` 提供 `engage` / `release` / `state`。

!!! todo
    待按 `fabot` 包类型提示补全急停状态机与恢复步骤。

## events

`robot.events` 订阅整机事件（`estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed`）。见 [事件与数据通道](../../usage/events-channels.md)。

!!! todo
    补各事件 payload 与订阅生命周期。

## status

`state()` / `status()` / `faults()` / `version()` / `sdk_version` 聚合整机状态。见 [状态、故障与生命周期](../../usage/status-faults.md)。

!!! todo
    补 `RobotStatus` / `RobotFaults` 字段说明。
