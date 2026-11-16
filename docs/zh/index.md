---
title: fabot SDK 文档
status: draft
owner: fabot-core
updated: 2026-11-16
---

# fabot SDK 文档

fabot SDK 是面向集成开发者的客户端开发包，用于在应用侧连接、控制并监控一台 fabot 机器人。本文档只覆盖客户端 SDK（`fabot-sdk` Python wheel），不含机器人内部实现。

- **Python**：`fabot-sdk`（import 名 `fabot`），要求 Python ≥ 3.12
- 本站对应 SDK **1.1.0-alpha.1**；与已安装版本不一致时以 `fabot.__version__` 为准，见 [版本配套](install/compatibility.md)

## 一分钟上手

安装 SDK 后（见 [安装与配置](install/index.md)），几行代码即可连接机器人并调用能力：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.version(), robot.sdk_version)
    state = robot.state()
    print(state.mode.name, state.health.name)
    if robot.screen.has_adapter:
        robot.screen.show_text("Hello, fabot!")
```

预期输出（值随现场变化，能打印即说明连通；`RobotMode` / `HealthState` 是 `IntEnum`，直接打印是数字，所以用 `.name` 取名称）：

```console
1.1.0-alpha.1 1.1.0-alpha.1
Idle Normal
```

:::note 先确认这台机器人装了什么
`wait_ready()` 只等已绑定且标记为必需的槽位，未装的能力会被静默跳过。完整的三段式上手（连通 → 探测槽位 → 调用能力）见 [第一个程序](tutorials/python.md)。
:::

没有机器人也可以先离线开发：`Robot.mock()` 提供无需硬件的仿真入口，见 [Mock 测试](usage/mock.md)。

## 阅读导航

| 章节 | 内容 | 适合人群 |
|------|------|----------|
| [快速开始](tutorials/python.md) | 三段式上手：连通、探测槽位、调用能力 | 所有读者，先看这个 |
| [概述与架构](overview.md) | SDK 在系统中的位置、术语、两层 API | 所有读者 |
| [安装与配置](install/index.md) | 环境要求、Python 安装、版本配套 | 所有读者，从这里开始 |
| [常规操作](usage/index.md) | 连接、约定、Command / Operation、并发与安全、事件与通道、状态与故障、日志与指标、坐标系、错误与诊断码、配置、Mock、技能、服务 | 所有读者 |
| [Python 示例](examples/python/index.md) | 按能力的完整 Python 示例 | 应用开发 |
| [能力接口概述](reference/python/index.md) | Robot 入口、诊断码、文本目录、通用类型与各能力模块的接口参考 | 应用开发 |
| [故障排除](troubleshooting.md) | 连不上、`wait_ready`、Operation 失败、急停恢复、坐标系、抓帧与升降柱问题 | 所有读者 |
| [更新日志](changelog.md) | 各版本新增、变更、修复与兼容性说明 | 升级前查阅 |

## 版本配套

SDK 与机器人端的版本基线见 [版本配套](install/compatibility.md)。
