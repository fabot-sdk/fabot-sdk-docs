---
title: Logs, Metrics & Observability
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Logs, Metrics & Observability

The SDK exposes three observability entries: `robot.logs` (structured logs), `robot.metrics` (metrics) and `robot.freeze()` / `robot.logs.freeze()` (freeze the flight recorder). All of them use the telemetry channel and occupy no capability slot.

## Logs

### Subscribing to live logs

```python
robot.logs.subscribe(callback, min_level=..., *, slot=None, on_error=None) -> SubscriptionToken
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `callback` | `Callable[[LogRecord], None]` | (required) | Receives decoded log records |
| `min_level` | `LogLevel` | `Info` | `Debug` / `Info` / `Warn` / `Error` |
| `slot` | `str \| None` | `None` | Only this slot |
| `on_error` | — | `None` | Delivery error callback |

```python
from fabot.core import LogLevel

token = robot.logs.subscribe(
    lambda record: print(record.level, record.component, record.message),
    min_level=LogLevel.Warn,
)
# ...
token.close()
```

### Querying history

```python
robot.logs.history(min_level=..., *, slot=None, unit=None, limit: int = 200) -> list[LogRecord]
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `min_level` | `LogLevel` | `Info` | Minimum level |
| `slot` | `str \| None` | `None` | Only this slot |
| `unit` | `str \| None` | `None` | Only this run unit (for example one service process) |
| `limit` | `int` | `200` | Maximum number of records |

History is persisted by the robot observability side with daily retention; `history()` is a query and opens no subscription.

```python
for record in robot.logs.history(min_level=LogLevel.Error, limit=50):
    print(record.ts_us, hex(record.code), record.message, record.trace_id)
```

### Emitting custom logs

```python
robot.logs.emit(log, *, level=..., action=..., component=..., slot=..., attrs=None, trace_id=..., unit=..., domain=..., module=..., source=..., code=..., ts_us=...) -> None
robot.logs.debug(message: str, **kwargs) -> None
robot.logs.info(message: str, **kwargs) -> None
robot.logs.warn(message: str, **kwargs) -> None
robot.logs.error(message: str, **kwargs) -> None
```

`log` may be a single `LogRecord`, a batch of them, or a plain string (the keyword arguments fill the rest). `debug` / `info` / `warn` / `error` are level-preset wrappers.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `level` | `LogLevel` | `Info` | Log level |
| `action` | `str` | `"custom"` | Action name; with `component` it forms the catalog key |
| `component` | `str` | `""` | Component name |
| `slot` | `str` | `""` | Owning slot |
| `attrs` | mapping / pairs | `None` | Extra attributes merged into template placeholders |
| `trace_id` | `str` | `""` | Trace id |
| `unit` / `domain` / `module` / `source` | `str` | `""` | Normalized identity fields |
| `code` | `int` | `0` | Diagnostic code |
| `ts_us` | `int` | `0` | Timestamp; `0` lets the SDK fill it |

```python
robot.logs.info("application started", component="app", domain="integration")
robot.logs.error("gripper command rejected", component="app", slot="left_gripper", code=0x0103000C)
```

### LogRecord

| Field | Type | Description |
|-------|------|-------------|
| `ts_us` | `int` | Timestamp in microseconds |
| `level` | `LogLevel` | Level |
| `component` / `action` | `str` | Component and action (the catalog key is `{component}.{action}`) |
| `message` | `str` | Raw message |
| `trace_id` | `str` | Trace id |
| `node_id` | `str` | Node id |
| `instance_id` / `capability_id` / `method` | `str` | Owning instance, capability and command |
| `operation_id` / `channel_id` | `str` | Related operation and channel |
| `error_category` | `str` | Error category name |
| `attrs` | list of pairs | Structured attributes |
| `identity` | `LogIdentity` | `unit` / `domain` / `module` / `source` |
| `code` | `int` | Diagnostic code |
| `src` / `seq` | `str` / `int` | Source and sequence |
| `is_raw` | `bool` | Whether this is an unnormalized raw line |

For human-readable text use `Catalogs.format_log(record)`, see [Catalogs](catalogs.md).

## Metrics

### Subscribing and querying

```python
robot.metrics.subscribe(callback, *, name=None, unit=None, on_error=None) -> SubscriptionToken
robot.metrics.snapshot() -> SdkMetricSnapshot
robot.metrics.records() -> list[MetricRecord]
```

| Member | Description |
|--------|-------------|
| `subscribe(...)` | Metric stream filtered by `name` and `unit` |
| `snapshot()` | SDK-internal counters as a dataclass |
| `records()` | The same counters projected into `MetricRecord` objects for forwarding |

`SdkMetricSnapshot`:

| Field | Type | Description |
|------|------|-------------|
| `connected` | `int` | Whether connected (gauge, `0` / `1`) |
| `resolve_success` / `resolve_failure` | `int` | Slot resolution successes and failures |
| `resolve_cache_hits` | `int` | Resolution cache hits |
| `command_success` / `command_failure` | `int` | Command successes and failures |
| `command_errors` | `dict[str, int]` | Command failures per error category |
| `channel_subscriptions` | `int` | Currently open channel subscriptions |
| `log_counts` | `dict[str, int]` | Log records per level |
| `log_records_dropped` | `int` | Log records dropped on a full buffer |
| `ts_us` / `start_ts_us` | `int` | Sample time and process start time in microseconds |

Everything except `connected` is cumulative since process start.

```python
snap = robot.metrics.snapshot()
print(snap.connected, snap.command_success, snap.command_errors)
for record in robot.metrics.records():
    print(record.name, record.metric_type, record.value.scalar)
```

### Emitting custom metrics

```python
robot.metrics.emit(metric, value=None, *, metric_type=..., labels=None, unit=..., domain=..., module=..., source=..., ts_us=..., start_ts_us=...) -> None
robot.metrics.gauge(name: str, value, **kwargs) -> None
robot.metrics.counter(name: str, value, *, start_ts_us: int = 0, **kwargs) -> None
robot.metrics.histogram(name: str, *, count=0, sum=0.0, minimum=0.0, maximum=0.0, bounds=(), counts=(), samples=None, start_ts_us=0, **kwargs) -> None
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `metric` | `MetricRecord \| sequence \| str` | (required) | A record, a batch, or a metric name |
| `value` | `float \| int \| MetricValue \| None` | `None` | Scalar value or a full `MetricValue` |
| `metric_type` | `MetricType` | `GAUGE` | `GAUGE` / `COUNTER` / `HISTOGRAM` |
| `labels` | mapping / pairs | `None` | Labels |
| `unit` / `domain` / `module` / `source` | `str` | `""` | Normalized identity fields |
| `ts_us` / `start_ts_us` | `int` | `0` | Sample time and window start |

`histogram` accepts either `bounds` + `counts` (pre-bucketed) or `samples`; with samples the SDK computes buckets, counts, sum, minimum and maximum.

```python
robot.metrics.gauge("app.queue.depth", 3, unit="count")
robot.metrics.counter("app.jobs.done", 1, labels={"result": "ok"})
robot.metrics.histogram("app.job.ms", samples=[12.0, 18.5, 41.0], unit="ms")
```

### MetricRecord

| Field | Type | Description |
|-------|------|-------------|
| `ts_us` | `int` | Sample time in microseconds |
| `name` | `str` | Metric name |
| `metric_type` | `MetricType` | `UNKNOWN` / `GAUGE` / `COUNTER` / `HISTOGRAM` |
| `value` | `MetricValue` | Scalar or bucketed value |
| `identity` | `MetricIdentity` | `unit` / `domain` / `module` / `source` |
| `start_ts_us` | `int` | Cumulative window start |
| `labels` | list of pairs | Labels |
| `seq` | `int` | Sequence number |

`type` is a read/write alias of `metric_type`.

## Freezing the flight recorder

```python
robot.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
robot.logs.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

Asks the robot observability side to freeze the flight recorder (recent logs, metrics and events) into a snapshot for later analysis. Both entries are equivalent; `robot.logs.freeze()` is just the log-flavoured spelling.

```python
robot.logs.freeze(
    reason="navigation stalled",
    code=0x0103000C,
    source="app",
    attrs={"job": "deliver-17"},
)
```

Freezing returns nothing to the caller: the snapshot stays on the robot and is retrieved through the deployment's operations process.

## Related

- Event subscription conventions: [Events & Data Channels](events-channels.md)
- Catalog text and localization: [Catalogs](catalogs.md)
- Status and fault model: [Status, Faults & Lifecycle](status-faults.md)
