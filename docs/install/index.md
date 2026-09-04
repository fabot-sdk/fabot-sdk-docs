---
title: 安装与配置
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 安装与配置

本节说明 fabot Python SDK 的环境要求、安装步骤与版本配套原则。SDK 以 Python wheel 形式分发，安装后的导入名为 `fabot`，不依赖 ROS。

## 快速开始

满足 [环境要求](requirements.md) 后，安装 SDK 并校验：

```console
$ pip install fabot-sdk        # 或安装发行物中的 wheel 文件
```

```python
import fabot
print(fabot.__version__)       # 校验安装成功，输出已安装的 SDK 版本
```

连接真实机器人（地址与端口以实际部署为准，控制面默认端口 7557）：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.version())
```

没有机器人时可以用 `Robot.mock()` 离线开发与验证，见 [Mock 测试](../usage/mock.md)。

## 分节导航

| 页面 | 内容 |
|------|------|
| [环境要求](requirements.md) | 操作系统、架构、Python 版本与网络条件 |
| [安装 Python SDK](python.md) | 安装 wheel、依赖说明与安装校验 |
| [版本配套](compatibility.md) | SDK 与机器人平台的版本配套原则 |

## 下一步

- [第一个程序（Python）](../tutorials/python.md)：从零跑通一个最小示例
- [连接与 Robot 入口](../usage/connection.md)：连接方式、超时与连接状态订阅
- 连不上机器人或 `wait_ready` 超时时查 [故障排除](../troubleshooting.md)
