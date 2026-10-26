---
title: 更新日志
status: draft
owner: fabot-core
updated: 2026-10-26
---

# 更新日志

按 SDK 版本倒序列出对外可见的变更。每个版本与同版本号的机器人平台配套；版本号语义与升级步骤见 [版本配套](install/compatibility.md)。

顶栏版本下拉可切换各版本对应的文档；某个历史版本的更新日志只包含到该版本为止的条目。

## 1.0.2

2026-10-23 · 推荐使用

### 新增

- 相机：新增 `get_intrinsics()`，读取彩色 / 深度两路内参（K 与畸变，不含外参），见 [相机 Camera](reference/python/camera.md#get_intrinsics)。
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
