---
title: IO (Digital Pins)
status: draft
owner: fabot-core
updated: 2026-11-02
---

# IO (Digital Pins)

## Module Overview

- Capability id: `io`; slots: `robot.io`
- Domain: `io`; capability version: `1.1.0`
- Acquire and release digital pins and read or write their level. Levels are `bool`; call `acquire` before use and `release` afterwards.
- Pin numbers depend on the robot wiring; the examples use `17`.

`UNKNOWN` is not a legal command value and is rejected.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `acquire` | `PinClaim` | `PinApplied` | 1000 ms |
| `release` | `Pin` | `PinApplied` | 1000 ms |
| `set_level` | `PinLevel` | `PinLevelApplied` | 1000 ms |
| `get_level` | `Pin` | `PinLevelApplied` | 1000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

Enums used on this page:

**`PinDirection` enum**

| Value | Description |
|-------|-------------|
| `INPUT` | Input |
| `OUTPUT` | Output |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### acquire

Acquire a pin with a direction. Repeating the same direction is idempotent; changing direction requires `release` first.

```python
acquire(pin: int, *, direction: PinDirection, timeout_ms: int = 1000) -> PinApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `pin` | `int` | (required) | Pin number |
| `direction` | `PinDirection` | (required) | Pin direction |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `PinApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `pin` | `int` | Pin number |

```python
from fabot.capabilities.io import PinDirection

applied = robot.io.acquire(17, direction=PinDirection.OUTPUT)
print(applied.outcome.success, applied.pin)

robot.io.set_level(17, value=True)
print(robot.io.get_level(17).value)
robot.io.release(17)
```

### release

Release an acquired pin; calling it on a free pin is rejected.

```python
release(pin: int, *, timeout_ms: int = 1000) -> PinApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `pin` | `int` | (required) | Pin number |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `PinApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `pin` | `int` | Pin number |

### set_level

Write a digital output level; acquire the pin as `OUTPUT` first.

```python
set_level(pin: int, *, value: bool, timeout_ms: int = 1000) -> PinLevelApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `pin` | `int` | (required) | Pin number |
| `value` | `bool` | (required) | Value |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `PinLevelApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `pin` | `int` | Pin number |
| `value` | `bool` | Value |

### get_level

Read the level of an acquired pin, in either direction.

```python
get_level(pin: int, *, timeout_ms: int = 1000) -> PinLevelApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `pin` | `int` | (required) | Pin number |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `PinLevelApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `pin` | `int` | Pin number |
| `value` | `bool` | Value |

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

All four calls are short Commands and the module declares no exclusive resource. Different pins are independent; one pin must be acquired before reading or writing and released afterwards.
