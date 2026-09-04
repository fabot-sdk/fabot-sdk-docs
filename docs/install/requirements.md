---
title: 环境要求
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 环境要求

fabot SDK 是纯 Python 包，嵌入你的应用进程运行，**不依赖 ROS**（不链接 `rclcpp` / `rclpy`）。任何满足下列软硬件与网络条件的主机都可以作为 SDK 客户端。

## 软件环境

| 项 | 要求 |
|----|------|
| 操作系统 | Ubuntu 24.04（开发与验证基线） |
| CPU 架构 | x86_64（amd64）或 AArch64（arm64） |
| Python | ≥ 3.12（`fabot-sdk` 声明 `requires-python >= 3.12`） |
| 包管理 | `pip`（建议配合 `venv` 使用） |

SDK 的运行时依赖（`flatbuffers` / `eclipse-zenoh` / `PyYAML`）随 `pip install` 自动安装，其中 `eclipse-zenoh` 被精确锁定在与机器人端控制面相同的版本家族，见 [版本配套](compatibility.md)。

!!! note "其他 Linux 发行版"
    其他发行版上 SDK 可能也能工作，但只有 Ubuntu 24.04 是验证过的基线。生产环境请按基线配置，或先自行完整验证。

## 网络要求

SDK 通过 Zenoh 与机器人端的控制面通信，运行主机需要满足：

- 网络可达机器人控制面端口（zenohd，**默认 TCP 7557**），防火墙需放行该端口；
- 主机与机器人之间的时延与丢包在可接受范围内——控制类调用（Command/Operation）对时延不敏感，但相机、关节位置等高频[数据通道](../usage/events-channels.md)建议走有线或稳定的局域网。

连接时用 IP 与端口指定端点：

```python
from fabot import Robot

robot = Robot.connect("192.168.1.10", 7557)
```

连接方式、`ClientConfig` / `ClientOptions` 参数见 [连接与 Robot 入口](../usage/connection.md)；连不上时的排查步骤见 [故障排除](../troubleshooting.md)。

## 离线开发

没有真实机器人时不需要任何网络环境：`Robot.mock()` 提供本地 Mock 实现，可直接开发与联调，见 [Mock 测试](../usage/mock.md)。

## 下一步

- [安装 Python SDK](python.md)：安装 wheel 并验证 `import fabot`
- [版本配套](compatibility.md)：SDK 与机器人平台的版本对应原则
- [Python 入门教程](../tutorials/python.md)：从零跑通第一个程序
