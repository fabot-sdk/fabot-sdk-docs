---
title: 安装 Python SDK
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 安装 Python SDK

fabot 机器人的产品级 Python SDK 以 `fabot-sdk` 包发布，安装后的导入名为 `fabot`。安装前请确认满足 [环境要求](requirements.md)（Python ≥ 3.12）。

## 安装

SDK 以 wheel 形式随发行物分发。拿到 wheel 文件后本地安装：

```console
$ pip install /path/to/fabot_sdk-<版本>.whl
```

如果所用环境配置了包含 `fabot-sdk` 的包索引，也可以直接按包名安装：

```console
$ pip install fabot-sdk
```

建议在虚拟环境中安装，避免与系统 Python 环境相互影响。

## 依赖

以下依赖由 pip 自动安装，无需手动处理：

| 依赖 | 版本约束 | 说明 |
|------|----------|------|
| `flatbuffers` | 精确锁定（`==23.5.26`） | 数据通道的序列化格式 |
| `eclipse-zenoh` | 精确锁定（`==1.6.2`） | 与机器人控制面通信，必须与机器人端同版本家族 |
| `PyYAML` | 不锁定 | 配置文件读写（`from_yaml` / `to_yaml`） |

`eclipse-zenoh` 版本与机器人端不匹配会导致连接失败，升级 SDK 时参见 [版本配套](compatibility.md)。

## 验证安装

```python
import fabot

print(fabot.__version__)   # 已安装的 SDK 版本
```

连接真实机器人进一步验证（地址与端口以实际部署为准）：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print("SDK 版本:", robot.sdk_version)
    print("平台版本:", robot.version())
```

没有机器人时，可用 [Mock 测试](../usage/mock.md) 中的 `Robot.mock()` 离线验证安装与开发代码。

## 下一步

- [连接与 Robot 入口](../usage/connection.md)：连接方式、超时与连接状态订阅
- [第一个程序（Python）](../tutorials/python.md)：最小可运行示例
- [接口参考（Python）](../reference/python/index.md)：各能力模块的完整 API
