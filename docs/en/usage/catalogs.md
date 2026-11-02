---
title: Catalogs
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Catalogs

Errors, faults, logs and metrics reported by the robot carry **diagnostic codes** and structured fields, never human-facing text. `Catalogs` (`fabot.catalogs`, importable from `fabot`) maps diagnostic codes, log keys and metric names to localized text for log panels, alerts and your own UI. It is a pure presentation helper and never talks to the robot. Signatures are in [Catalogs](../reference/python/catalogs.md).

## Loading and language

```python
from fabot import Catalogs

catalogs = Catalogs.load("zh-CN")   # no argument uses FABOT_LANG, then "en"
print(catalogs.language)            # "zh-CN"

catalogs.set_language("en")         # returns self, chainable
```

`Catalogs.load()` binds the text tables embedded in the SDK build and does pure lookups at runtime. `Catalogs.default()` returns a process-wide singleton, handy for high-frequency sites such as log formatting.

Language resolution follows a fallback chain: the given string, then `_` replaced with `-`, then `zh-CN` for any `zh*`, and finally `en`. Unknown languages fall back to English. A single lookup can override the default with `locale=`.

## Errors and faults

Diagnostic codes are keyed as `0xXXXXXXXX`, and the error and fault tables are consulted in one lookup. `format_error` accepts an error object or a bare integer code; `format_fault` takes a fault record directly (the code is on the record).

```python
from fabot import FabotError

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0)
except FabotError as err:
    print(hex(err.code), err.category, err.trace_id)
    print(catalogs.format_error(err))       # catalog text, else err.message
    print(err.localized("zh-CN"))           # same logic
```

```python
for record in robot.faults().chassis.records:
    print(hex(record.code), catalogs.format_fault(record))
```

On a miss the fallback order is: error table → fault table → `error.message` → `0xXXXXXXXX`. So after a platform upgrade without an SDK upgrade, new codes render as the local message or the raw code rather than blank.

## Logs

The log key is `{component}.{action}`. Placeholders in the matched template are filled from the record, and `record.attrs` entries are merged in without overriding known fields.

```python
def on_log(record):
    print(catalogs.format_log(record))

token = robot.logs.subscribe(on_log)
```

Built-in fields: `level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`. `level` is normalized to `debug` / `info` / `warn` / `error`, and `ts` is derived from `ts_us` as UTC ISO-8601.

On a miss the key itself (`component.action`) is returned, which makes missing catalog entries visible.

## Metrics

`format_metric(record)` looks up the title by `MetricRecord.name`, returning the name itself on a miss.

```python
for record in robot.metrics.records():
    print(catalogs.format_metric(record), record.value.scalar)
```

## Relationship to version compatibility

The text tables are a snapshot embedded in the SDK build. Platform diagnostic codes evolve; an older SDK cannot resolve new codes and falls back as described. Upgrading the SDK brings the full text. See [Version Compatibility](../install/compatibility.md).

## Related

- Error hierarchy and retryability: [Error Handling](errors.md)
- Log and metric entries: [Logs, Metrics & Observability](observability.md)
- Fault model: [Status, Faults & Lifecycle](status-faults.md)
- Full signatures: [Catalogs](../reference/python/catalogs.md)
