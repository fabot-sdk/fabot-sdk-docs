---
title: 日志、指标与可观测性
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 日志、指标与可观测性

SDK 提供三个可观测性入口：`robot.logs`（结构化日志）、`robot.metrics`（指标）与 `robot.freeze()` / `robot.logs.freeze()`（冻结飞行记录器）。它们都走同一条遥测通道，不占用能力槽位。

## 日志

### 订阅实时日志

```python
robot.logs.subscribe(callback, min_level=..., *, slot=None, on_error=None) -> SubscriptionToken
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `callback` | `Callable[[LogRecord], None]` | （必填） | 收到解码后的日志记录 |
| `min_level` | `LogLevel` | `Info` | `Debug` / `Info` / `Warn` / `Error` |
| `slot` | `str \| None` | `None` | 只收该槽位的日志 |
| `on_error` | — | `None` | 投递错误回调 |

```python
from fabot.core import LogLevel

token = robot.logs.subscribe(
    lambda record: print(record.level, record.component, record.message),
    min_level=LogLevel.Warn,
)
# ...
token.close()
```

### 查询历史日志

```python
robot.logs.history(min_level=..., *, slot=None, unit=None, limit: int = 200) -> list[LogRecord]
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `min_level` | `LogLevel` | `Info` | 最低级别 |
| `slot` | `str \| None` | `None` | 只取该槽位 |
| `unit` | `str \| None` | `None` | 按运行单元过滤（如某个服务进程） |
| `limit` | `int` | `200` | 返回条数上限 |

历史日志由机器人端的观测侧持久化，按天保留；`history()` 是主动查询，不建立订阅。

```python
for record in robot.logs.history(min_level=LogLevel.Error, limit=50):
    print(record.ts_us, hex(record.code), record.message, record.trace_id)
```

### 上报自定义日志

```python
robot.logs.emit(log, *, level=..., action=..., component=..., slot=..., attrs=None, trace_id=..., unit=..., domain=..., module=..., source=..., code=..., ts_us=...) -> None
robot.logs.debug(message: str, **kwargs) -> None
robot.logs.info(message: str, **kwargs) -> None
robot.logs.warn(message: str, **kwargs) -> None
robot.logs.error(message: str, **kwargs) -> None
```

`log` 可以是单条 `LogRecord`、一批 `LogRecord`，或直接给字符串（此时其余关键字参数补齐其余字段）。`debug` / `info` / `warn` / `error` 是设好 `level` 的便捷包装。

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `level` | `LogLevel` | `Info` | 日志级别 |
| `action` | `str` | `"custom"` | 动作名，与 `component` 一起决定文本目录键 |
| `component` | `str` | `""` | 组件名 |
| `slot` | `str` | `""` | 归属槽位 |
| `attrs` | 映射 / 键值序列 | `None` | 附加属性，会并入文本模板占位符 |
| `trace_id` | `str` | `""` | 链路追踪 id |
| `unit` / `domain` / `module` / `source` | `str` | `""` | 归一化身份字段 |
| `code` | `int` | `0` | 诊断码 |
| `ts_us` | `int` | `0` | 时间戳；`0` 表示由 SDK 填充 |

```python
robot.logs.info("application started", component="app", domain="integration")
robot.logs.error("gripper command rejected", component="app", slot="left_gripper", code=0x0103000C)
```

### LogRecord

| 字段 | 类型 | 说明 |
|------|------|------|
| `ts_us` | `int` | 时间戳（微秒） |
| `level` | `LogLevel` | 级别 |
| `component` / `action` | `str` | 组件与动作，构成文本目录键 `{component}.{action}` |
| `message` | `str` | 原始消息 |
| `trace_id` | `str` | 链路追踪 id |
| `node_id` | `str` | 节点 id |
| `instance_id` / `capability_id` / `method` | `str` | 归属实例、能力与命令 |
| `operation_id` / `channel_id` | `str` | 关联的任务与通道 |
| `error_category` | `str` | 关联错误的分类名 |
| `attrs` | 键值对列表 | 结构化属性 |
| `identity` | `LogIdentity` | `unit` / `domain` / `module` / `source` 四元组 |
| `code` | `int` | 诊断码 |
| `src` / `seq` | `str` / `int` | 来源与序号 |
| `is_raw` | `bool` | 是否为未归一化的原始行 |

展示给人看的文本用 `Catalogs.format_log(record)`，见 [文本目录 Catalogs](catalogs.md)。

## 指标

### 订阅与查询

```python
robot.metrics.subscribe(callback, *, name=None, unit=None, on_error=None) -> SubscriptionToken
robot.metrics.snapshot() -> SdkMetricSnapshot
robot.metrics.records() -> list[MetricRecord]
```

| 成员 | 说明 |
|------|------|
| `subscribe(...)` | 指标流；`name` 按指标名过滤，`unit` 按运行单元过滤 |
| `snapshot()` | SDK 自身计数快照 |
| `records()` | 把同一份计数导出为 `MetricRecord` 列表，便于转发到自己的监控系统 |

`SdkMetricSnapshot`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `connected` | `int` | 当前是否已连接（gauge，`0` / `1`） |
| `resolve_success` / `resolve_failure` | `int` | 槽位解析成功 / 失败次数 |
| `resolve_cache_hits` | `int` | 解析缓存命中次数 |
| `command_success` / `command_failure` | `int` | 命令成功 / 失败次数 |
| `command_errors` | `dict[str, int]` | 按错误分类累计的命令失败次数 |
| `channel_subscriptions` | `int` | 当前打开的通道订阅数 |
| `log_counts` | `dict[str, int]` | 按级别累计的日志条数 |
| `log_records_dropped` | `int` | 因缓冲满而丢弃的日志条数 |
| `ts_us` / `start_ts_us` | `int` | 采样时刻与进程启动时刻（微秒） |

除 `connected` 是当前读数外，其余都是进程启动以来的累计值。

```python
snap = robot.metrics.snapshot()
print(snap.connected, snap.command_success, snap.command_errors)
for record in robot.metrics.records():
    print(record.name, record.metric_type, record.value.scalar)
```

### 上报自定义指标

```python
robot.metrics.emit(metric, value=None, *, metric_type=..., labels=None, unit=..., domain=..., module=..., source=..., ts_us=..., start_ts_us=...) -> None
robot.metrics.gauge(name: str, value, **kwargs) -> None
robot.metrics.counter(name: str, value, *, start_ts_us: int = 0, **kwargs) -> None
robot.metrics.histogram(name: str, *, count=0, sum=0.0, minimum=0.0, maximum=0.0, bounds=(), counts=(), samples=None, start_ts_us=0, **kwargs) -> None
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `metric` | `MetricRecord \| 序列 \| str` | （必填） | 指标记录、一批记录或指标名 |
| `value` | `float \| int \| MetricValue \| None` | `None` | 标量值或完整的 `MetricValue` |
| `metric_type` | `MetricType` | `GAUGE` | `GAUGE` / `COUNTER` / `HISTOGRAM` |
| `labels` | 映射 / 键值序列 | `None` | 标签 |
| `unit` / `domain` / `module` / `source` | `str` | `""` | 归一化身份字段 |
| `ts_us` / `start_ts_us` | `int` | `0` | 采样时刻与窗口起点 |

`histogram` 可以给 `bounds` + `counts`（已分桶），也可以给 `samples`（样本列表），后者由 SDK 计算分桶、计数、和、最小值与最大值。

```python
robot.metrics.gauge("app.queue.depth", 3, unit="count")
robot.metrics.counter("app.jobs.done", 1, labels={"result": "ok"})
robot.metrics.histogram("app.job.ms", samples=[12.0, 18.5, 41.0], unit="ms")
```

### MetricRecord

| 字段 | 类型 | 说明 |
|------|------|------|
| `ts_us` | `int` | 采样时刻（微秒） |
| `name` | `str` | 指标名 |
| `metric_type` | `MetricType` | `UNKNOWN` / `GAUGE` / `COUNTER` / `HISTOGRAM` |
| `value` | `MetricValue` | 标量或分桶值（`scalar` / `count` / `sum` / `minimum` / `maximum` / `bounds` / `counts`） |
| `identity` | `MetricIdentity` | `unit` / `domain` / `module` / `source` |
| `start_ts_us` | `int` | 累计窗口起点 |
| `labels` | 键值对列表 | 标签 |
| `seq` | `int` | 序号 |

`type` 是 `metric_type` 的读写别名。

## 冻结飞行记录器

```python
robot.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
robot.logs.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

请求机器人端的观测侧把当前的飞行记录器（最近的日志、指标与事件缓冲区）冻结成快照，便于事后分析。两个入口等价，`robot.logs.freeze()` 只是更贴近日志语义的写法。

```python
robot.logs.freeze(
    reason="navigation stalled",
    code=0x0103000C,
    source="app",
    attrs={"job": "deliver-17"},
)
```

冻结本身不返回内容：快照留在机器人端，按发布方的运维流程取回。

## 与其他页面的关系

- 事件订阅的通用约定：[事件与数据通道](events-channels.md)
- 文本目录与本地化：[文本目录 Catalogs](catalogs.md)
- 状态与故障模型：[状态、故障与生命周期](status-faults.md)
