---
title: Localized Text (Catalogs)
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Localized Text (Catalogs)

`Catalogs` (`fabot.catalogs`, importable from the `fabot` top level) turns structured logs, error codes, and fault records into localized text for HMIs and log panels. It is a lookup table embedded in the SDK: it never contacts the robot, is not a capability module, and has no slots. Method signatures are in [Catalogs](../reference/python/catalogs.md).

In program logic, keep matching on `FabotError.code` / `category` and typed fault bags — **never match localized strings**.

## Loading and Language

`Catalogs.load()` binds the text tables embedded in the current SDK version. `set_language(locale)` sets the display locale and returns `self` (chainable); `language` is the current preference (read-only).

```python
from fabot import Catalogs

catalogs = Catalogs.load().set_language("zh-CN")
print(catalogs.language)    # "zh-CN"
```

Lookup walks a candidate chain: the raw locale → the same string with `_` replaced by `-` → `zh-CN` if the locale is `zh*` → finally `en`. Unknown locales fall back to English. An empty or unset locale is treated as `en`.

## Localizing Errors

`format_error` accepts a `FabotError` or an `int` code and looks up `str(code)`. On a miss it falls back to `error.message`, then to the code string. For the error hierarchy, retries, and `trace_id`, see [Error Handling](errors.md).

```python
from fabot import Catalogs, FabotError, Robot

catalogs = Catalogs.load().set_language("zh-CN")

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    try:
        robot.chassis.stop()
    except FabotError as err:
        print(catalogs.format_error(err))      # localized text by err.code
        print(catalogs.format_error(81001))    # an int code works too
```

## Localizing Logs

`format_log` looks up `{component}.{action}`; on a miss it returns that key. Subscribe with `robot.logs.subscribe`, then format the `LogRecord` in the callback — see [Events & Data Channels](events-channels.md).

```python
from fabot import Catalogs, Robot
from fabot.core import LogLevel

catalogs = Catalogs.load().set_language("zh-CN")

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()

    def on_log(record):
        print(catalogs.format_log(record))

    token = robot.logs.subscribe(on_log, min_level=LogLevel.Warn)
```

The callback still runs on the SDK I/O thread: keep formatting and hand-off lightweight, and do not call blocking APIs from the callback.

## Localizing Faults

`format_fault` looks up `{capability_id}/{catalog_id}`. On a miss it falls back to `fault_id`, then to `catalog_id`.

- Records that already carry `capability_id` (`RobotFaultRecord`) can omit the second argument.
- Capability-level `CapabilityFaultRecord` / `FaultState` do not carry `capability_id` — pass `capability_id=` explicitly, otherwise a `ValueError` is raised.
- `robot.faults()` and `robot.events.faults_changed` expose per-slot typed fault bags (`FaultState`), which are the latter case and need a capability id.

No module currently declares named faults, so fault bags usually contain only `revision` and `format_fault` typically hits the fallback. The API still follows the rules above. For the fault model, see [Status, Faults & Lifecycle](status-faults.md).

```python
# RobotFaultRecord already carries capability_id
print(catalogs.format_fault(record))

# FaultState / CapabilityFaultRecord need an explicit capability id
print(catalogs.format_fault(slot_fault, capability_id="chassis"))
```

## Snapshot and Misses

Localized texts are frozen at the SDK release. If the robot platform is updated while the SDK is not, newly added error codes or faults are still reported; they simply have no catalog entry and display the raw ID via the fallbacks above. Upgrading the SDK brings the latest texts — see [Version Compatibility](../install/compatibility.md).

`format_log` / `format_error` / `format_fault` **do not raise** on a miss; they only apply the fallback.
