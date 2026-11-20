---
title: 版本配套
status: draft
owner: fabot-core
updated: 2026-11-20
---

# 版本配套

fabot SDK 与机器人系统按**同一套产品版本号**发布，格式为 `MAJOR.MINOR.PATCH[-stage.N]`（如 `1.2.3`、`1.2.3-rc.1`）。本页说明怎样查两端版本、发行版本号怎么读，以及升级时的注意事项。

产品目前仍在快速迭代，接口与版本节奏还没有完全稳定，因此**暂时不提供跨版本的兼容性承诺**。等这一阶段过去，会给出明确的兼容性承诺（哪些版本之间保证可用、升级路径是什么），并在本页更新。

| 项 | 基线 |
|----|------|
| API 版本 | `fabot/v1` |
| Python 包 | `fabot-sdk`（`requires-python >= 3.12`；依赖 `flatbuffers`、`eclipse-zenoh`、`PyYAML`） |

:::note 以已安装的 SDK 为准
接口、错误码与行为以已安装的 `fabot-sdk` 类型提示与本文档为准。
:::

## 本文档对应的版本

本站（`main`）对应 **1.1.0**，与 `fabot.__version__` / `robot.sdk_version` 对照使用；两者不一致时以已安装的包为准。

顶栏版本下拉里的「最新」由本站构建时的 `package.json` 版本决定，因此它显示 `v1.1.0(最新)`。`1.1.0` 是正式版；带 `-dev` / `-alpha` / `-beta` / `-rc` 后缀的预发布版适合联调与验证，不建议直接用于生产。

## 版本号的读法

版本号描述这份发行物自身的位置，暂时不用来判断与其它版本能否配合：

| 位 | 表示什么 |
|----|----------|
| MAJOR | 产品的大版本线 |
| MINOR | 该大版本线内的功能增量 |
| PATCH | 该功能集上的修订 |

预发布阶段的顺序为 `dev` < `alpha` < `beta` < `rc` < 正式版；同一阶段内按序号递增，如 `1.1.0-alpha.1` < `1.1.0-alpha.2`。

各版本具体改了什么见 [更新日志](../../changelog.md)。

## 查看两端版本

```python
import fabot
from fabot import Robot

print(fabot.__version__)      # 本地 SDK 版本

with Robot.connect("127.0.0.1", 7557) as robot:
    print(robot.sdk_version)  # 同上：本地 SDK 版本
    print(robot.version())    # 远端机器人平台版本
```

- `fabot.__version__` 与 `robot.sdk_version` 是安装在**本机**的 SDK 版本；
- `robot.version()` 查询**机器人端**平台的版本，需要已建立连接，见 [连接与 Robot 入口](../../usage/basics/connection.md)。

:::note 0.0.0 是哨兵版本
`0.0.0` 表示未经正式发版流程的测试构建，不应用于生产环境。`Robot.mock()` 的 `version()` 默认也返回 `"0.0.0"`（见 [Mock 测试](../../usage/testing/mock.md)）。
:::

## 配套原则

- **建议同版本配套**：SDK 与机器人系统按同一个产品版本号一起发布，同版本组合是我们在测试中主要覆盖的用法。
- **混用版本请自行验证**：现阶段两端版本不一致时不提供可用性判断，也可能出现接口缺失或行为差异。上线前请在测试环境完整验证。
- **连接被拒时**：线协议对不上时，连接或调用会以 `ProtocolIncompatible` 失败（见 [错误处理](../../usage/diagnostics/errors.md)）。这是运行时的实际结果，不代表对其它组合的可用性判断。

## eclipse-zenoh 版本必须匹配

SDK 对 `eclipse-zenoh` 做精确锁定（当前 `==1.6.2`），与机器人端控制面使用**同一版本家族**，这是通信正常工作的硬性前提：

- 不要手动升级或降级环境中的 `eclipse-zenoh`，以 `fabot-sdk` 声明的依赖为准；
- SDK 与机器人端的 zenoh 版本家族不匹配会导致连接失败，排查见 [故障排除](../../troubleshooting.md)。

其余依赖中 `flatbuffers` 同样精确锁定，`PyYAML` 不锁定，见 [安装 Python SDK](./python.md) 的依赖表。

## 文本目录随 SDK 快照

`Catalogs` 的本地化日志 / 错误 / 故障文本是随 SDK 版本嵌入的快照。机器人系统更新而 SDK 未更新时，新增的错误码或故障仍能正常上报，只是文本目录中没有对应条目，按原始 ID 回退显示；升级 SDK 即可获得最新文本。用法见 [文本目录 Catalogs](../../usage/diagnostics/catalogs.md)。

## 升级步骤

1. 机器人系统升级后，把 SDK 换到同一版本：用新发行物中的 wheel 重新安装（见 [安装 Python SDK](./python.md)）；机器人系统自身的升级步骤见 [机器人系统安装与升级](./robot-system.md)。
2. 用 `fabot.__version__` 与 `robot.version()` 核对两端版本一致。
3. 在测试环境跑通关键流程（连接、`wait_ready`、核心能力调用）后再切换到生产环境。

## 下一步

- [环境要求](./requirements.md)：操作系统、架构、Python 与网络条件
- [安装 Python SDK](./python.md)：安装 wheel 与依赖说明
- [机器人系统安装与升级](./robot-system.md)：机器人侧软件的安装、升级与回滚
- [错误处理](../../usage/diagnostics/errors.md)：错误分类、`ProtocolIncompatible` 与重试策略
- [故障排除](../../troubleshooting.md)：连接失败等问题的排查步骤
