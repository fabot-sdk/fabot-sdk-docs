---
title: fabot SDK 文档
status: draft
owner: fabot-core
updated: 2026-09-04
---

# fabot SDK 文档

fabot SDK 是面向集成开发者的客户端开发包，用于在应用侧连接、控制并监控一台 fabot 机器人。本文档只覆盖客户端 SDK（`fabot-sdk` Python wheel），不含机器人内部实现。

- **Python**：`fabot-sdk`（import 名 `fabot`），要求 Python ≥ 3.12

## 一分钟上手

安装 SDK 后（见 [安装与配置](install/index.md)），几行代码即可连接机器人并调用能力：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    robot.screen.show_text(text="Hello, fabot!")
```

没有机器人也可以先离线开发：`Robot.mock()` 提供无需硬件的仿真入口，见 [Mock 测试](usage/mock.md)。

## 阅读导航

| 章节 | 内容 | 适合人群 |
|------|------|----------|
| [概述与架构](overview.md) | SDK 在系统中的位置、术语、两层 API | 所有读者 |
| [安装与配置](install/index.md) | 环境要求、Python 安装、版本配套 | 所有读者，从这里开始 |
| [常规操作](usage/index.md) | 连接、Command / Operation、事件与通道、状态与故障、配置、错误处理、Mock | 所有读者 |
| [第一个程序（Python）](tutorials/python.md) | 跑通第一个 Python 程序 | 所有读者 |
| [Python 示例](examples/python/index.md) | 按能力的完整 Python 示例 | 应用开发 |
| [能力接口概述](reference/python/index.md) | 每个能力模块的 Python 接口参考 | 应用开发 |
| [故障排除](troubleshooting.md) | 连不上、`wait_ready`、Operation 失败、急停后恢复 | 所有读者 |

## 版本配套

SDK 与机器人端的版本基线见 [版本配套](install/compatibility.md)。
