---
title: 错误处理
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 错误处理

SDK 的所有调用失败都以 `FabotError` 及其子类抛出。本文说明异常层次、错误字段与错误码、Command / Operation 的错误表现与重试策略。面向人机界面的本地化文本见 [文本目录 Catalogs](catalogs.md)。

## 异常层次与错误字段

`FabotError` 是所有 SDK 错误的基类（定义在 `fabot.core.error`，可从 `fabot` 顶层导入）。每个错误实例携带五个字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 全局唯一错误码（分段见下文） |
| `category` | `ErrorCategory` | 错误分类（十类，见下表） |
| `message` | `str` | 英文技术描述，供日志与排查 |
| `retryable` | `bool` | 是否可安全重试 |
| `trace_id` | `str` | 链路追踪 ID，用于与机器人端日志对照 |

错误按 `ErrorCategory` 分为十类，每类对应一个 `FabotError` 子类；机器人端返回的错误会按 `category` 自动映射为对应子类实例，因此既可按子类精确捕获，也可统一捕获基类：

```python
from fabot import FabotError
from fabot.core.error import Timeout, NotFound

try:
    robot.chassis.stop(timeout_ms=500)
except Timeout as e:
    print(e.code, e.retryable, e.trace_id)
except FabotError as e:
    print(e.category, e.message)
```

十个分类子类之外，还有四个专用子类（`fabot.errors` / `fabot.core.error`）：

| 异常 | 继承自 | code | 触发场景 |
|------|--------|------|----------|
| `ConfigurationConflict` | `ResourceConflict` | 81001 | 配置 CAS 冲突，见 [配置管理](configuration.md) |
| `AdapterUnbound` | `NotFound` | 6002 | 槽位未绑定 adapter，见 [连接与 Robot 入口](connection.md) |
| `AdapterMismatch` | `InvalidArgument` | 6003 | `as_adapter()` 的目标类型与已绑定 adapter 不符 |
| `ClientThreadError` | `InvalidArgument` | 6003 | 在 SDK I/O 线程（事件回调）里调用阻塞 API，见 [事件与数据通道](events-channels.md) |

## 错误分类

所有调用失败归入 `ErrorCategory` 十类，抛对应的 `FabotError` 子类，可按分类捕获：

| 分类 | 异常 | 典型场景 |
|------|-------------|----------|
| `InvalidArgument` | `InvalidArgument` | 参数非法 |
| `NotFound` | `NotFound` | 槽位/资源不存在（`AdapterUnbound`，6002） |
| `Timeout` | `Timeout` | 调用超时 |
| `ResourceConflict` | `ResourceConflict` | 资源占用；`ConfigurationConflict`（81001） |
| `Canceled` | `Canceled` | 任务被取消 |
| `TransportError` | `TransportError` | 传输层失败 |
| `ProtocolIncompatible` | `ProtocolIncompatible` | 协议版本不兼容 |
| `Unavailable` | `Unavailable` | 对端不可用 |
| `Unauthorized` | `Unauthorized` | 鉴权失败 |
| `Internal` | `Internal` | 服务端内部错误 |

## 错误码

错误码全局唯一，分段分配：

| 段 | 归属 |
|----|------|
| 6xxx | SDK 客户端本地错误（`AdapterUnbound` 6002、`AdapterMismatch` / `ClientThreadError` 6003、传输层 6112–6114 等） |
| 8xxxx | 平台错误（如 `ConfigurationConflict` 81001） |
| 9xxxx | 能力私有错误 |

程序中判断错误请用 `code` / `category`，不要匹配 `message` 文本；需要展示给人看的文本时用文本目录，见 [文本目录 Catalogs](catalogs.md)。

## Command 与 Operation 的错误表现

- **Command**（同步请求-响应）：失败即抛 `FabotError` 子类。超时抛 `Timeout`；默认超时见各能力文档，可被 `ClientOptions.command_timeout_ms` 与调用级 `timeout_ms` 覆盖。
- **Operation**（长时任务）：返回句柄后不阻塞。提交即被拒绝（参数非法、资源冲突等）时在调用处立即抛错；运行期失败**不抛异常**，通过终态快照获取——`snapshot.state` 为 `Failed` / `Canceled` / `Timeout` 时从 `snapshot.error` 取 `FabotError`：

```python
from fabot.capabilities.chassis import NavigationMode
from fabot.core.types import OperationState

op = robot.chassis.navigate_to_station(station_id=1, mode=NavigationMode.AUTONOMOUS)
snapshot = op.get(timeout_ms=30000)
if snapshot.state == OperationState.Failed:
    err = snapshot.error            # FabotError：失败原因
    print(err.code, err.category, err.message)
```

Command / Operation 模型本身见 [命令与长时操作](commands-operations.md)。

## 重试策略

- `retryable` 为 `True` 的错误（如传输层的 `Timeout` / `Unavailable` / `TransportError`）可按指数退避重试，并设置总时长或次数上限。
- `InvalidArgument`、`ProtocolIncompatible` 等不可重试：修正调用参数，或检查 SDK 与机器人端的版本配套（见 [版本配套](../install/compatibility.md)）。
- `ConfigurationConflict` 是特例：`retryable` 为 `False`，但语义上的处理就是重试——重新 `get()`、合并修改（`merge_touched`）后再 `apply()`，见 [配置管理](configuration.md)。

## 本地化错误文本（文本目录）

展示给人看的错误 / 日志 / 故障文本用 `Catalogs.format_error` / `format_log` / `format_fault`，不要匹配 `message`。加载、语言回退与未命中规则见 [文本目录 Catalogs](catalogs.md)，签名见 [文本目录 Catalogs](../reference/python/catalogs.md)。

## 常见本地错误

- `AdapterUnbound`（6002）/ `AdapterMismatch`（6003）：槽位未绑定，或 `as_adapter()` 的目标类型与已绑定 adapter 不符，见 [连接与 Robot 入口](connection.md)。
- `ClientThreadError`（6003）：在 SDK I/O 线程（事件回调）里调用了阻塞 API，见 [事件与数据通道](events-channels.md)。
- 传输层错误：`Unavailable`（6112，会话已关闭）、`TransportError`（6113）、`Timeout`（6114，查询超时），均 `retryable=True`；连不上机器人的排查见 [故障排除](../troubleshooting.md)。
- `ConfigurationConflict`（81001）：配置 CAS 冲突，按上文重试策略处理，见 [配置管理](configuration.md)。
