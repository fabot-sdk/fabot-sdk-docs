---
title: 错误处理
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 错误处理

SDK 的所有调用失败都以 `FabotError` 及其子类抛出。本文说明异常层次、错误字段与诊断码、Command / Operation 的错误表现与重试策略。面向人机界面的本地化文本见 [文本目录 Catalogs](catalogs.md)。

## 异常层次与错误字段

`FabotError` 是所有 SDK 错误的基类（定义在 `fabot.core.error`，可从 `fabot` 顶层导入）。每个错误实例携带：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码，32 位，通常以 `0x` 十六进制展示 |
| `category` | `ErrorCategory \| None` | 构造时用来选择具体子类的分类标签；**不随错误在总线上传递**，解码得到的错误可能为 `None` |
| `message` | `str` | 本地技术描述，只在本机生成，不随协议传输 |
| `retryable` | `bool` | 是否可安全重试；由错误的具体类型推导 |
| `trace_id` | `str` | 链路追踪 id，用于与机器人端日志对照 |

`retryable` 为 `True` 的具体类型是 `Timeout`、`ResourceConflict`、`TransportError`、`Unavailable`。`message` 只在本地有意义：机器人端返回的错误带的是诊断码，文案由 [文本目录 Catalogs](catalogs.md) 渲染，所以不要按 `message` 文本分支判断。

## 错误分类

`ErrorCategory` 是构造标签，`FabotError.__new__` 按它分派到具体子类；因此既能按子类精确捕获，也能统一捕获基类：

| 分类 | 异常子类 | 典型场景 |
|------|----------|----------|
| `InvalidArgument` | `InvalidArgument` | 参数非法 |
| `NotFound` | `NotFound` | 槽位 / 资源不存在（`AdapterUnbound`、坐标名未知） |
| `Timeout` | `Timeout` | 调用超时（同时是内置 `TimeoutError`） |
| `ResourceConflict` | `ResourceConflict` | 资源占用；`ConfigurationConflict` |
| `Canceled` | `Canceled` | 任务被取消 |
| `TransportError` | `TransportError` | 传输层失败 |
| `ProtocolIncompatible` | `ProtocolIncompatible` | 协议版本不兼容 |
| `Unavailable` | `Unavailable` | 对端不可用 |
| `Unauthorized` | `Unauthorized` | 鉴权失败 |
| `Internal` | `Internal` | 服务端内部错误 |

```python
from fabot import FabotError

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0, timeout_ms=500)
except FabotError as err:
    print(hex(err.code), err.category, err.retryable, err.trace_id)
```

### 专用子类

| 异常 | 继承自 | 触发场景 |
|------|--------|----------|
| `ClientThreadError` | `InvalidArgument` | 在 SDK I/O 线程（事件回调）里调用阻塞 API，见 [事件与数据通道](events-channels.md) |
| `AdapterUnbound` | `NotFound` | 槽位未绑定 adapter，见 [连接与 Robot 入口](connection.md) |
| `AdapterMismatch` | `InvalidArgument` | `as_adapter()` 的目标类型与已绑定 adapter 不符 |
| `ConfigurationConflict` | `ResourceConflict` | 配置 CAS 冲突，见 [配置管理](configuration.md) |
| `FrameError` 系 | `FabotError` 及若干混入 | 坐标系查询失败，见 [坐标系与变换](frames.md) |

`FrameError` 的子类会同时继承一个语义基类：`FrameNotFoundError` / `FrameConnectivityError` 属 `NotFound`，`FrameMismatchError` / `FrameCycleError` / `InvalidFrameNameError` / `InvalidQuaternionError` 属 `InvalidArgument`，`FrameTimeoutError` 属 `Timeout`。按 `NotFound` 之类的语义基类捕获即可覆盖坐标系的同类失败。

## 诊断码

诊断码是 32 位整数，按高字节分段（`0x01` 平台与运行时、`0x07` SDK 客户端等）；具体码与文案的对照在文本目录里。程序中判断错误请用 `code` 或 `category`，不要匹配 `message`；展示文本用 `Catalogs.format_error`，见 [文本目录 Catalogs](catalogs.md)。

```python
print(hex(err.code))                    # 诊断码
print(catalogs.format_error(err))       # 本地化文本
print(err.localized("zh-CN"))           # 同一逻辑
```

## Command 与 Operation 的错误表现

- **Command**（同步请求-响应）：失败即抛 `FabotError` 子类。超时抛 `Timeout`；默认超时见各能力文档，可被 `ClientOptions.command_timeout_ms` 与调用级 `timeout_ms` 覆盖。
- **Operation**（长时任务）：返回句柄后不阻塞。提交即被拒绝（参数非法、资源冲突、`reject` 策略冲突等）时在调用处立即抛错；运行期失败**不抛异常**，通过终态快照获取——`snapshot.state` 为 `Failed` / `Canceled` / `Timeout` 时从 `snapshot.error` 取 `FabotError`：

```python
from fabot.core import OperationState

op = robot.chassis.move_station(1)
snapshot = op.get(timeout=30.0)
if snapshot.state == OperationState.Failed:
    err = snapshot.error            # FabotError：失败原因
    print(hex(err.code), err.message, err.trace_id)
```

`op.wait()` 是另一种写法：内部等到终态，失败时直接抛错（`Failed` 抛 `FabotError`、`Canceled` 抛 `Canceled`、`Timeout` 抛 `Timeout`），成功时返回 `result`。

Command / Operation 模型本身见 [命令与长时操作](commands-operations.md)。

## 重试策略

- `retryable` 为 `True` 的错误（`Timeout` / `Unavailable` / `TransportError` / `ResourceConflict`）可按指数退避重试，并设置总时长或次数上限。
- `InvalidArgument`、`ProtocolIncompatible` 等不可重试：修正调用参数，或检查 SDK 与机器人端的版本配套（见 [版本配套](../install/compatibility.md)）。
- `ConfigurationConflict` 是特例：`retryable` 为 `False`，但语义上的处理就是重试——重新 `get()`、合并修改（`merge_touched`）后再 `apply()`，见 [配置管理](configuration.md)。
- 槽位失效类错误（如实例被替换）SDK 内部会做一次重新解析；应用层不必重复。

## 常见本地错误

- `ClientThreadError`：在 SDK I/O 线程（事件回调）里调用了阻塞 API，见 [事件与数据通道](events-channels.md)。
- `AdapterUnbound` / `AdapterMismatch`：`as_adapter()` / `get_config()` 遇到未绑定的槽位，或目标 adapter 类型与已绑定的不符，见 [连接与 Robot 入口](connection.md)。
- 传输层错误：`Unavailable` / `TransportError` / `Timeout`，均 `retryable=True`；连不上机器人的排查见 [故障排除](../troubleshooting.md)。
- 坐标系错误：`FrameNotFoundError` / `FrameConnectivityError` 等，见 [坐标系与变换](frames.md)。
