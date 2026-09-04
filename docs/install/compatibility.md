---
title: 版本配套
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 版本配套

fabot SDK 与机器人平台（机器人端运行的控制面软件）按**同一套产品版本号**发布，格式为 `MAJOR.MINOR.PATCH[-stage.N]`（如 `1.2.3`、`1.2.3-rc.1`）。本页说明 SDK 与机器人平台的版本配套原则与升级注意事项。

| 项 | 基线 |
|----|------|
| API 版本 | `fabot/v1` |
| Python 包 | `fabot-sdk`（`requires-python >= 3.12`；依赖 `flatbuffers`、`eclipse-zenoh`、`PyYAML`） |

!!! note "以已安装的 SDK 为准"
    接口、错误码与行为以已安装的 `fabot-sdk` 类型提示与本文档为准。

## 版本号语义

| 位 | 何时递增 | 兼容性含义 |
|----|----------|------------|
| MAJOR | 公开 API 出现不兼容变化 | 跨 MAJOR 不保证兼容 |
| MINOR | 向后兼容的新功能、新接口 | 旧客户端可继续工作 |
| PATCH | 仅缺陷修复，不改变既有行为 | 完全兼容 |

预发布阶段的顺序为 `dev` < `alpha` < `beta` < `rc` < 正式版。

## 查看两端版本

```python
import fabot
from fabot import Robot

print(fabot.__version__)      # 本地 SDK 版本

with Robot.connect("192.168.1.10", 7557) as robot:
    print(robot.sdk_version)  # 同上：本地 SDK 版本
    print(robot.version())    # 远端机器人平台版本
```

- `fabot.__version__` 与 `robot.sdk_version` 是安装在**本机**的 SDK 版本；
- `robot.version()` 查询**机器人端**平台的版本，需要已建立连接，见 [连接与 Robot 入口](../usage/connection.md)。

!!! note "0.0.0 是哨兵版本"
    `0.0.0` 表示未经正式发版流程的测试构建，不应用于生产环境。`Robot.mock()` 的 `version()` 默认也返回 `"0.0.0"`（见 [Mock 测试](../usage/mock.md)）。

## 配套原则

- **推荐同版本配套**：SDK 与机器人平台使用同一发行版本，这是唯一经过完整验证的组合。
- **同 MAJOR 内跨版本**：按版本号语义，MINOR / PATCH 差异是向后兼容的，一般可以工作，但不在完整验证范围内——例如 SDK 侧新增的接口在旧版本机器人上可能不可用。生产环境升级任一端后应自行完整验证。
- **跨 MAJOR**：不保证兼容。线协议不兼容时，连接或调用会以 `ProtocolIncompatible` 错误失败（见 [错误处理](../usage/errors.md)）。

## eclipse-zenoh 版本必须匹配

SDK 对 `eclipse-zenoh` 做精确锁定（当前 `==1.6.2`），与机器人端控制面使用**同一版本家族**，这是通信正常工作的硬性前提：

- 不要手动升级或降级环境中的 `eclipse-zenoh`，以 `fabot-sdk` 声明的依赖为准；
- SDK 与机器人端的 zenoh 版本家族不匹配会导致连接失败，排查见 [故障排除](../troubleshooting.md)。

其余依赖中 `flatbuffers` 同样精确锁定，`PyYAML` 不锁定，见 [安装 Python SDK](python.md) 的依赖表。

## 错误文本目录随 SDK 快照

`Catalogs` 的本地化日志 / 错误 / 故障文本是随 SDK 版本嵌入的快照。机器人平台更新而 SDK 未更新时，平台上新增的错误码或故障仍能正常上报，只是目录中没有对应条目，按原始 ID 回退显示；升级 SDK 即可获得最新文本。用法见 [错误处理](../usage/errors.md)。

## 升级步骤

1. 机器人平台升级后，将 SDK 升级到同一版本：用新发行物中的 wheel 重新安装（见 [安装 Python SDK](python.md)）。
2. 用 `fabot.__version__` 与 `robot.version()` 核对两端版本一致。
3. 在测试环境跑通关键流程（连接、`wait_ready`、核心能力调用）后再切换到生产环境。

## 下一步

- [环境要求](requirements.md)：操作系统、架构、Python 与网络条件
- [安装 Python SDK](python.md)：安装 wheel 与依赖说明
- [错误处理](../usage/errors.md)：错误分类、`ProtocolIncompatible` 与重试策略
- [故障排除](../troubleshooting.md)：连接失败等问题的排查步骤
