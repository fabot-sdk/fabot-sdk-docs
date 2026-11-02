---
title: Light
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Light

## Module Overview

- Capability id: `light`; slots: `robot.light`
- Domain: `light`; capability version: `1.1.0`
- Light-strip appearance: mode, color, brightness and animation period, last write wins.
- `OFF` and `RAINBOW` ignore the color; `UNKNOWN` is not a legal command value.

Writes and `get_status` all return `LightStatusApplied` (`outcome` plus `status`).

## API Overview

| Name | Kind | Description |
|------|------|------|
| `set_mode` | Command | Switch the mode and set color plus period; the brightness is unchanged; default timeout 1000 ms. |
| `set_color` | Command | Change only the color; default timeout 1000 ms. |
| `set_brightness` | Command | Change only the brightness; default timeout 1000 ms. |
| `set_period` | Command | Change only the period; no visible effect for `OFF` / `SOLID`; default timeout 1000 ms. |
| `get_status` | Command | Read the current strip snapshot; `get_state` is an alias; default timeout 1000 ms. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

Enums used on this page:

**`LightMode` enum**

| Value | Description |
|-------|-------------|
| `OFF` | Off (color ignored) |
| `SOLID` | Solid |
| `BLINK` | Blink |
| `BREATHE` | Breathe |
| `RAINBOW` | Rainbow (color ignored) |
| `CHASE` | Chase |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### set_mode

Switch the mode and set color plus period; the brightness is unchanged.

```python
set_mode(mode: LightMode, *, color: Rgb8, period_ms: int = 0, target_light: int = 0, timeout_ms: int = 1000) -> LightStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `LightMode` | (required) | Mode value |
| `color` | `Rgb8` | (required) | Color imaging control |
| `period_ms` | `int` | `0` | Animation period in milliseconds |
| `target_light` | `int` | `0` | Target strip index; 0 means default |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LightStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `LightStatus` | Status snapshot |

```python
from fabot.capabilities.light import LightMode
from fabot.types import Rgb8

applied = robot.light.set_mode(LightMode.BREATHE, color=Rgb8(r=255, g=0, b=0), period_ms=2000)
print(applied.outcome.success, applied.status.mode, applied.status.period_ms)
```

### set_color

Change only the color.

```python
set_color(*, r: int, g: int, b: int, timeout_ms: int = 1000) -> LightStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `r` | `int` | (required) | Red channel, 0–255 |
| `g` | `int` | (required) | Green channel, 0–255 |
| `b` | `int` | (required) | Blue channel, 0–255 |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LightStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `LightStatus` | Status snapshot |

### set_brightness

Change only the brightness.

```python
set_brightness(brightness: int, *, timeout_ms: int = 1000) -> LightStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `brightness` | `int` | (required) | Brightness from 0 to 255 |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LightStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `LightStatus` | Status snapshot |

### set_period

Change only the period; no visible effect for `OFF` / `SOLID`.

```python
set_period(period_ms: int, *, timeout_ms: int = 1000) -> LightStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `period_ms` | `int` | (required) | Animation period in milliseconds |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LightStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `LightStatus` | Status snapshot |

### get_status

Read the current strip snapshot; `get_state` is an alias.

```python
get_status(*, timeout_ms: int = 1000) -> LightStatusApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LightStatusApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `status` | `LightStatus` | Status snapshot |

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md).

## Events

Subscribe through `robot.<slot>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

| Entry | Event type | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`: `Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot` |

## Faults

Query with `robot.<slot>.faults()`, which returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`: 

| Field | Type | Description |
|------|------|------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

For human-readable fault text use `Catalogs.format_fault(record, capability_id="...")`; see [Catalogs](../../usage/catalogs.md).

## Status

This module has no `status()`; see `robot.status()` for the aggregated view.

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

All five calls are short Commands with no long-running tasks or exclusive resources; nothing queues or rejects.
