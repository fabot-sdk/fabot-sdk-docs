---
title: Catalogs
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Catalogs

`Catalogs` is a standalone viewer-side helper (`fabot.catalogs`, importable from the `fabot` top level). It is not a capability module and has no slots. `Catalogs.load()` binds the log / error / fault text tables embedded in the SDK; at runtime it is a pure table lookup and never contacts the robot. For when and how to use it, see [Localized Text (Catalogs)](../../usage/catalogs.md).

## Module Overview

- Not a capability: no slots, no Commands / Operations
- Product path: `Catalogs.load()`; tests or custom UIs may pass tables to the constructor
- Display language is set with `set_language`; misses fall back through a candidate chain ending at `en`

## API Overview

This module has no Commands, Operations, data channels, or events.

| Member | Description |
|--------|-------------|
| `Catalogs(...)` | Construct with custom tables; product code should call `load()` |
| `load()` | Bind the SDK-embedded tables and return a `Catalogs` |
| `language` | Current language preference (read-only) |
| `set_language(locale)` | Set the language and return `self` |
| `format_log(record)` | Fill a `{component}.{action}` template |
| `format_error(error)` | Fill a `FabotError.code` template |
| `format_fault(record, capability_id="")` | Fill a `{capability_id}/{catalog_id}` template |

## Methods

### Catalogs

```python
Catalogs(
    logs: Mapping[str, Mapping[str, str]] | None = None,
    errors: Mapping[str, Mapping[str, str]] | None = None,
    faults: Mapping[str, Mapping[str, str]] | None = None,
    language: str = "en",
) -> Catalogs
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `logs` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Log table: key is `component.action`, value is locale → template |
| `errors` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Error table: key is the code string, value is locale → template |
| `faults` | `Mapping[str, Mapping[str, str]] \| None` | `None` | Fault table: key is `{capability_id}/{catalog_id}`, value is locale → template |
| `language` | `str` | `"en"` | Initial language preference; empty string becomes `"en"` |

`None` is treated as an empty table. Product code should call `load()` rather than populate the embedded tables by hand.

### load

```python
Catalogs.load() -> Catalogs
```

Binds the log / error / fault tables embedded in the current SDK version. Takes no arguments.

```python
from fabot import Catalogs

catalogs = Catalogs.load()
```

### language

```python
catalogs.language -> str
```

Current language preference (read-only). It is written by the constructor or `set_language`; lookup then walks the fallback chain, so the property value need not equal the locale tag that finally matches.

### set_language

```python
set_language(locale: str) -> Catalogs
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | `str` | (required) | Display locale; empty string becomes `"en"` |

Returns `self` for chaining. Lookup candidates: the raw locale → the same string with `_` replaced by `-` → `zh-CN` if the locale is `zh*` → finally `en`. Unknown locales fall back to English.

```python
catalogs = Catalogs.load().set_language("zh-CN")
```

### format_log

```python
format_log(record: Any) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `record` | `Any` | (required) | Log record, typically a `LogRecord`; fields are read by attribute |

Lookup key: `{component}.{action}`. On a miss, returns that key. On a hit, `{placeholder}` tokens are filled from record fields; unknown placeholders become an empty string.

Built-in fields: `level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`. `level` is normalized to `debug` / `info` / `warn` / `error` (integers `0`–`3` or the same names as strings; `warning` becomes `warn`). `ts` is UTC ISO-8601 derived from `ts_us`. Extra keys from `record.attrs` are merged in but never override the known fields above.

```python
print(catalogs.format_log(record))
```

### format_error

```python
format_error(error: Any) -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `Any` | (required) | A `FabotError` (or any object with `code` / `message`), or an `int` code |

Lookup key: `str(code)`. On a miss, falls back to `error.message`, then to the code string. Templates may use `{code}` and `{message}`.

```python
print(catalogs.format_error(err))
print(catalogs.format_error(81001))
```

### format_fault

```python
format_fault(record: Any, capability_id: str = "") -> str
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `record` | `Any` | (required) | Fault record; `catalog_id` / `fault_id` / `capability_id` are read by attribute |
| `capability_id` | `str` | `""` | Capability id; if empty, `record.capability_id` is used |

Lookup key: `{capability_id}/{catalog_id}`. If neither source yields a capability id, raises `ValueError`. On a miss, falls back to `fault_id`, then to `catalog_id`. `RobotFaultRecord` carries `capability_id`; `CapabilityFaultRecord` / `FaultState` do not — pass it explicitly.

```python
print(catalogs.format_fault(record))
print(catalogs.format_fault(slot_fault, capability_id="chassis"))
```

## Channels

No data channels. For the shared channel model, see [Events & Data Channels](../../usage/events-channels.md).

## Events

No events. Structured logs come from `robot.logs.subscribe`; see [Events & Data Channels](../../usage/events-channels.md).

## Faults / Exceptions

`format_fault` raises `ValueError` (not `FabotError`) when `capability_id` cannot be resolved. `format_log` / `format_error` / `format_fault` do not raise on a catalog miss; they apply the fallbacks above. For the protocol error hierarchy, see [Error Handling](../../usage/errors.md).

## Status

No status bag. Inputs for fault display come from `robot.faults()` / per-slot `faults()` / `FaultState`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

No resource handle. Texts are a snapshot embedded at the SDK release; newly added platform codes or faults fall back to the raw ID until the SDK is upgraded. See [Version Compatibility](../../install/compatibility.md).
