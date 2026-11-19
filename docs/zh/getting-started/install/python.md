---
title: 安装 Python SDK
status: draft
owner: fabot-core
updated: 2026-11-19
---

# 安装 Python SDK

fabot 机器人的产品级 Python SDK 以 `fabot-sdk` 包发布，安装后的导入名为 `fabot`。安装前请确认满足 [环境要求](./requirements.md)（Python ≥ 3.12）。

## 安装

SDK 以 wheel 形式随发行物分发，有两条安装路径。

**方式一：随机器人系统携带（推荐）**。fabot 系统包内置了同版本的 SDK wheel，直接在机器人本机用 `fabot sdk` 命令把它装进自己的环境：

```console
$ fabot sdk show                    # 查看随系统携带的 SDK 名称与版本
$ python3 -m venv .venv
$ fabot sdk install .venv          # 装进已有 venv / uv / Miniforge / Mamba 环境
$ .venv/bin/python -c "import fabot; print(fabot.__version__)"
```

uv 与 Miniforge / Mamba 环境同样支持（先 `uv venv .venv` 或 `mamba create -p .venv python=3.12`，再 `fabot sdk install .venv`）；普通 conda 前缀会被拒绝。机器人系统升级后，用 `fabot sdk upgrade .venv` 把环境对齐到新版本；`fabot sdk export <目标路径>` 可把 wheel 拷贝到离线机器；`fabot sdk init <空目录>` 生成一个可运行的最小示例（`main.py --mock` 无机器人可跑）。

**方式二：从 wheel 文件安装**。拿到 wheel 文件后本地安装：

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
| `flatbuffers` | 精确锁定（`==23.5.26`） | 请求 / 响应与通道帧的序列化格式 |
| `eclipse-zenoh` | 精确锁定（`==1.6.2`） | 与机器人控制面通信，必须与机器人端同版本家族 |
| `PyYAML` | 不锁定 | 配置文件读写（`from_yaml` / `to_yaml`） |

`eclipse-zenoh` 版本与机器人端不匹配会导致连接失败，升级 SDK 时参见 [版本配套](./compatibility.md)。

:::note numpy 是可选依赖
`deproject_depth_to_points()`（别名 `depth_to_points`）**必需 numpy**，未安装时直接抛 `ImportError`。`transform_points()` 在装了 `numpy` 时返回 `ndarray` 并走矩阵加速，没装时退化为纯 Python 逐点计算（返回列表），功能可用但明显更慢。处理点云时请安装 `numpy`。
:::

## 验证安装

```python
import fabot

print(fabot.__version__)   # 已安装的 SDK 版本
```

连接真实机器人进一步验证（示例用本机回环地址 `127.0.0.1`；机器人不在本机时换成实际地址）：

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print("SDK 版本:", robot.sdk_version)
    print("平台版本:", robot.version())
    print("运行模式:", robot.state().mode.name, "健康度:", robot.state().health.name)
```

机器人控制面就在本机时，也可以省略地址直接连接：

```python
with Robot.connect() as robot:      # 本机使用，不传 IP
    print(robot.version())
```

没有机器人时，可用 [Mock 测试](../../usage/testing/mock.md) 中的 `Robot.mock()` 离线验证安装与开发代码：

```python
from fabot import Robot

robot = Robot.mock()
print(robot.connection.is_connected())     # True
print(robot.chassis.get_pose())
```

## 下一步

- [连接与 Robot 入口](../../usage/basics/connection.md)：连接方式、超时与连接状态订阅
- [第一个程序（Python）](../quickstart.md)：最小可运行示例
- [接口参考（Python）](../../reference/python/index.md)：各能力模块的完整 API
