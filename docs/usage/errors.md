---
title: 错误处理
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 错误处理

## 错误分类

所有调用失败归入 `ErrorCategory` 十类。抛对应的 `FabotError` 子类，可按分类捕获：

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

## 错误码

错误码全局唯一，分段分配：

| 段 | 归属 |
|----|------|
| 6xxx | client 侧本地错误（如 `ClientThreadError` 6003） |
| 8xxxx | 平台错误 |
| 9xxxx | 能力私有错误 |

## 重试策略

`retryable == true` 的错误（如 `Timeout`、`Unavailable`）可按指数退避重试；`InvalidArgument`、`ProtocolIncompatible` 等不可重试，需修正调用或升级版本。

## 本地化错误文本（Catalogs）

`Catalogs`（`fabot.catalogs`）是嵌入 SDK 的日志/错误/故障文本目录，面向人机界面展示：

```python
from fabot import Catalogs

catalogs = Catalogs.load()
catalogs.set_language("zh")
print(catalogs.format_error(err))                    # 本地化错误文本
print(catalogs.format_fault(record, capability_id))  # 本地化故障文本
```

## 常见本地错误

- `ClientThreadError`（6003）：在 SDK I/O 线程（事件回调）里调用了阻塞 API，见 [事件与数据通道](events-channels.md)。
- `AdapterUnbound`（6002）/ `AdapterMismatch`：槽位未绑定或绑定的 adapter 类型与预期不符，见 [连接与 Robot 入口](connection.md)。
