---
title: fabot SDK 文档
status: draft
owner: fabot-core
updated: 2026-11-18
---

# fabot SDK 文档

fabot SDK 是面向集成开发者的客户端开发包，用于在应用侧连接、控制并监控一台 fabot 机器人。本文档只覆盖客户端 SDK（`fabot-sdk` Python wheel），不含机器人内部实现；机器人主机上随机器预装的系统软件只做背景介绍，见 [机器人系统与本地控制台](./usage/testing/robot-system.md)。

- **Python**：`fabot-sdk`（import 名 `fabot`），要求 Python ≥ 3.12
- 本站对应 SDK **1.1.0-beta.2**；与已安装版本不一致时以 `fabot.__version__` 为准，见 [版本配套](./getting-started/install/compatibility.md)

## 一分钟上手

安装 SDK 后（见 [安装与配置](./getting-started/install/index.md)），几行代码即可连接机器人并调用能力：

```python
from fabot import Robot

# 显式端点：本机回环地址 + 控制面端口（默认 7557）
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print(robot.version(), robot.sdk_version)
    state = robot.state()
    print(state.mode.name, state.health.name)
    if robot.screen.has_adapter:
        robot.screen.show_text("Hello, fabot!")
```

SDK 与机器人控制面在同一台主机上时（例如在机器人本体上开发），不用记地址：`Robot.connect()` 按默认配置自动发现端点。

```python
from fabot import Robot

with Robot.connect() as robot:      # 本机使用，不传 IP
    robot.wait_ready()
    print(robot.version())
```

预期输出（值随现场变化，能打印即说明连通；`RobotMode` / `HealthState` 是 `IntEnum`，直接打印是数字，所以用 `.name` 取名称）：

```console
1.1.0-beta.2 1.1.0-beta.2
Idle Normal
```

:::note 先确认这台机器人装了什么
`wait_ready()` 只等已绑定且标记为必需的槽位，未装的能力会被静默跳过。完整的三段式上手（连通 → 探测槽位 → 调用能力）见 [第一个程序](./getting-started/quickstart.md)。
:::

没有机器人也可以先离线开发：`Robot.mock()` 提供无需硬件的仿真入口，见 [Mock 测试](./usage/testing/mock.md)。

## 阅读导航

文档分三大章节：**入门**先跑起来，**章节**讲透通用机制与示例，**参考**供查阅。

**入门（Getting Started）**

| 页面 | 内容 |
|------|------|
| [概述与架构](./getting-started/overview.md) | SDK 在系统中的位置、术语、两层 API |
| [安装与配置](./getting-started/install/index.md) | 环境要求、Python 安装、版本配套 |
| [快速开始](./getting-started/quickstart.md) | 三段式上手：连通、探测槽位、调用能力 |

**章节（Sections）**

| 页面 | 内容 | 适合人群 |
|------|------|----------|
| [常规操作](./usage/index.md) | 五个主题章：基础机制、数据与状态、错误与诊断、配置技能与服务、测试迁移与背景 | 所有读者 |
| [Python 示例](./examples/python/index.md) | 按能力的完整 Python 示例 | 应用开发 |
| [机器人系统与本地控制台](./usage/testing/robot-system.md) | 机器人系统与 SDK 的关系、`fabot` 命令、`fabot console` 界面 | 现场运维 |
| [故障排除](./troubleshooting.md) | 连不上、`wait_ready`、Operation 失败、急停恢复、坐标系、抓帧与升降柱问题 | 所有读者 |

**参考（Reference）**

| 页面 | 内容 | 适合人群 |
|------|------|----------|
| [参考总览](./reference/python/index.md) | Robot 入口、诊断码、文本目录、通用类型、各能力模块，以及技能与平台服务的接口参考 | 应用开发 |
| [更新日志](./changelog.md) | 各版本新增、变更、修复与兼容性说明 | 升级前查阅 |

## 版本配套

SDK 与机器人端的版本基线见 [版本配套](./getting-started/install/compatibility.md)。
