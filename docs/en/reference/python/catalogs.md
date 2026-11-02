---
title: Catalogs
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Catalogs

`Catalogs` (localized text) is a standalone presentation helper (`fabot.catalogs`, importable from `fabot`), not a capability module, and has no slot. It maps **diagnostic codes**, **log keys** and **metric names** to localized text; `Catalogs.load()` binds the tables embedded in the SDK build and lookups are pure dictionary reads with no robot access. Use cases are in [Catalogs](../../usage/catalogs.md).

## Module overview

- Not a capability, no slot, no Commands / Operations / channels / events
- Product path: `Catalogs.load()`; `Catalogs.default()` returns a process-wide singleton
- Four tables: logs, errors, faults and metrics; the language comes from `set_language`, falling back to `en`

## API overview

| Member | Description |
|--------|-------------|
| `Catalogs(...)` | Construct from custom tables; product code should use `load()` |
| `load(language=None)` | Bind the embedded tables and return a `Catalogs` |
| `default()` | Process-wide lazily created singleton |
| `language` | Current language preference (read-only) |
| `set_language(locale)` | Set the language; returns `self` |
| `format_log(record, locale=None)` | Fill the `{component}.{action}` template |
| `format_error(error, locale=None)` | Fill the template for a diagnostic code `0xXXXXXXXX` |
| `format_fault(record, locale=None)` | Same as `format_error`, keyed by the record's code |
| `format_metric(record, locale=None)` | Look up a metric title by name |

## Methods

### Catalogs

```python
Catalogs(
    logs: Mapping[str, Mapping[str, str]] | None = None,
    errors: Mapping[str, Mapping[str, str]] | None = None,
    faults: Mapping[str, Mapping[str, str]] | None = None,
    metrics: Mapping[str, Mapping[str, str]] | None = None,
    language: str = "en",
) -> Catalogs
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `logs` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Log table keyed by `component.action` with language → template values |
| `errors` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Error table keyed by diagnostic code string (`0x0103000C`) |
| `faults` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Fault table, also keyed by diagnostic code string |
| `metrics` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Metric table keyed by metric name |
| `language` | `str` | `"en"` | Initial language; an empty string means `"en"` |

`None` counts as an empty table. Product code should call `load()` rather than filling the embedded tables by hand.

### load

```python
Catalogs.load(language: str | None = None) -> Catalogs
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `str \| None` | `None` | Initial language; `None` uses `FABOT_LANG`, else `en` |

```python
from fabot import Catalogs

catalogs = Catalogs.load("zh-CN")
```

### default

```python
Catalogs.default() -> Catalogs
```

Returns the process-wide lazily created singleton (loaded from `FABOT_LANG` on first use), handy for shared sites such as log formatting.

### language

```python
catalogs.language -> str
```

The current language preference (read-only). It is set by the constructor or `set_language`, while resolution applies the fallback chain at lookup time, so the property value need not equal the language actually matched.

### set_language

```python
set_language(locale: str) -> Catalogs
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | `str` | (required) | Display language; an empty string means `"en"` |

Returns `self`, so it chains. The candidate chain is: the given string, then `_` replaced with `-`, then `zh-CN` for any `zh*`, then `en`. Unknown languages fall back to English.

```python
catalogs = Catalogs.load().set_language("zh-CN")
```

### format_log

```python
format_log(record: Any, *, locale: str | None = None) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `record` | `Any` | (required) | Log record, usually a `LogRecord`; read by attribute |
| `locale` | `str \| None` | `None` | Language for this lookup; defaults to `self.language` |

The key is `{component}.{action}`. On a miss the key itself is returned. On a hit, `{placeholder}` fields are filled from the record; unknown placeholders become empty strings.

Built-in fields: `level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`. `level` is normalized to `debug` / `info` / `warn` / `error` (integers `0`–`3` or the equivalent strings, with `warning` treated as `warn`), and `ts` is derived from `ts_us` as UTC ISO-8601. Extra keys in `record.attrs` are merged in without overriding those fields.

```python
print(catalogs.format_log(record))
```

### format_error

```python
format_error(error: Any, *, locale: str | None = None) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `Any` | (required) | A `FabotError` (or any object with `code`), or a bare `int` diagnostic code |

The key is `0x{code:08X}`, consulted in the error table and then the fault table. A hit fills `{code}`; a miss falls back to `error.message` and then to the code string.

```python
print(catalogs.format_error(err))
print(catalogs.format_error(0x0103000C))
```

`FabotError.localized(locale=None)` is the convenience equivalent, and `str(err)` also includes catalog text when a language was set explicitly.

### format_fault

```python
format_fault(record: Any, *, locale: str | None = None) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `record` | `Any` | (required) | A fault record (`RobotFaultRecord` / `FaultState`, …); looked up by `code` |

Identical to `format_error`: the diagnostic code is already on the record, so no `capability_id` is needed.

```python
for record in robot.faults().chassis.records:
    print(catalogs.format_fault(record))
```

### format_metric

```python
format_metric(record: Any, *, locale: str | None = None) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `record` | `Any` | (required) | A `MetricRecord` or a metric name string; read from `name` |

The key is the metric name. A miss returns the name itself; an empty name returns an empty string.

```python
print(catalogs.format_metric(metric_record))
```

## Channels

No data channels. See [Events & Data Channels](../../usage/events-channels.md).

## Events

No events. Structured logs come from `robot.logs.subscribe`, see [Logs, Metrics & Observability](../../usage/observability.md).

## Exceptions

`format_log` / `format_error` / `format_fault` / `format_metric` never raise on a miss; they fall back as described. Protocol error handling is in [Error Handling](../../usage/errors.md).

## Status

No status bag. Fault text comes from `robot.faults()` / per-slot `faults()` / `FaultState`, see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

No resource handles. The text tables are a snapshot embedded in the SDK build; diagnostic codes the SDK does not know fall back to the raw code, see [Version Compatibility](../../install/compatibility.md).
