---
title: 安装总览
status: draft
owner: fabot-core
updated: 2026-11-20
---

# 安装总览

本章覆盖两件事：在应用机上**安装 SDK 客户端**，以及在机器人主机上**安装与配置机器人系统**。

| 组件 | 跑在哪 | 装什么 | 页面 |
|------|--------|--------|------|
| SDK | 你的应用进程 | `fabot-sdk` wheel，导入名 `fabot`，不依赖 ROS | [安装 Python SDK](./python.md) |
| 机器人系统 | 机器人主机 | 整机发行 zip，提供控制面、能力、技能与平台服务 | [机器人系统安装与升级](./robot-system.md) |

多数情况只需要装 SDK：机器人系统随机器人交付，出厂时已装好并配好。只有重装、升级、自建测试机或恢复损坏的系统时，才需要在机器人主机上安装机器人系统。

发行 zip、SDK wheel 与运控交付包都在[软件交付平台](https://app.five-ages.ai/downloads#p=0eec0050-0430-4e36-acb4-627be7bdd6ed)按版本与通道列出，顶栏「下载」下拉里也有同名入口。

## SDK 快速开始

满足 [环境要求](./requirements.md) 后，安装 SDK 并校验：

```console
$ pip install fabot-sdk        # 或安装发行物中的 wheel 文件
```

```python
import fabot
print(fabot.__version__)       # 校验安装成功，输出已安装的 SDK 版本
```

连接真实机器人（示例为本机回环地址与默认端口 7557；机器人不在本机时换成实际地址）：

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print(robot.version())
```

控制面就在本机时，也可以省略地址：`Robot.connect()` 按默认配置自动发现端点。

没有机器人时可以用 `Robot.mock()` 离线开发与验证，见 [Mock 测试](../../usage/testing/mock.md)。

## 机器人系统快速开始

在机器人主机上解压同版本的发行 zip，执行安装脚本，然后启动并体检：

```console
$ sudo ./fabot-install.sh
$ fabot status
$ fabot doctor
$ fabot start
```

机器人系统交付物里带同版本的 SDK wheel，机器人主机上可以用 `fabot sdk install <env>` 把它装进你的环境，不需要另外找包。安装、升级、回滚与卸载的完整说明见 [机器人系统安装与升级](./robot-system.md)；参数配置与首次开机配置见 [机器人系统配置](./robot-system-config.md)。

## 分节导航

| 页面 | 内容 |
|------|------|
| [环境要求](./requirements.md) | 操作系统、架构、Python 版本与网络条件 |
| [安装 Python SDK](./python.md) | 安装 wheel、依赖说明与安装校验 |
| [机器人系统安装与升级](./robot-system.md) | 发行物内容、安装、升级与回滚、卸载、目录布局 |
| [机器人系统配置](./robot-system-config.md) | 配置来源、端口与环境变量、首次开机配置、日志 |
| [版本配套](./compatibility.md) | 两端版本的查看方式、版本号读法与现阶段的兼容性说明 |

## 下一步

- [第一个程序（Python）](../quickstart.md)：从零跑通一个最小示例
- [连接与 Robot 入口](../../usage/basics/connection.md)：连接方式、超时与连接状态订阅
- [机器人系统运维与本地控制台](../../usage/testing/robot-system.md)：`fabot` 命令与 `fabot console` 界面
- 连不上机器人或 `wait_ready` 超时时查 [故障排除](../../troubleshooting.md)
