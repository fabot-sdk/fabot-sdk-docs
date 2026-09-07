---
title: IO (Digital Pins)
status: draft
owner: fabot-core
updated: 2026-09-07
---

# IO (Digital Pins)

## Module Overview

- Capability id: `io`; slot: `robot.io`
- Acquire and release digital pins, then read or write their level. Levels are `bool`. Call `acquire` before use and `release` when finished.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `acquire` | `pin`, `direction` | `PinAppliedT` | Command |
| `release` | `pin` | `PinAppliedT` | Command |
| `set_level` | `pin`, `value` | `PinLevelAppliedT` | Command |
| `get_level` | `pin` | `PinLevelAppliedT` | Command |

Command default `timeout_ms`: 1000 for every method (all overridable). All parameters are keyword-only. This module has no Operation and no data channels.

`PinDirection` enum:

| Value | Description |
|-------|-------------|
| `INPUT` | Input |
| `OUTPUT` | Output |

`UNKNOWN` is not a legal command value and will be rejected. Pin numbers are robot-specific; the examples use `17`.

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### acquire

Claim a pin and set its direction. Claiming the same pin again with the same direction succeeds (idempotent). To change direction, `release` first.

```python
acquire(*, pin: int, direction: PinDirection, timeout_ms: int = 1000) -> PinAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pin` | `int` | (required) | Pin number; must be ≥ 0 |
| `direction` | `PinDirection` | (required) | `INPUT` / `OUTPUT` |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`PinAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `pin` | `int` | Echo of the requested pin |

```python
from fabot.capabilities.io import PinDirection

applied = robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
print(applied.outcome.success, applied.pin)
```

### release

Release an acquired pin. Calling this on a pin that is not acquired will be rejected.

```python
release(*, pin: int, timeout_ms: int = 1000) -> PinAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pin` | `int` | (required) | Pin number; must be ≥ 0 |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`PinAppliedT`: same fields as `acquire`.

```python
applied = robot.io.release(pin=17)
print(applied.outcome.success, applied.pin)
```

### set_level

Write a digital output level. The pin must already be acquired as `OUTPUT`.

```python
set_level(*, pin: int, value: bool, timeout_ms: int = 1000) -> PinLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pin` | `int` | (required) | Pin number; must be ≥ 0 |
| `value` | `bool` | (required) | Target level |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`PinLevelAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `pin` | `int` | Echo of the requested pin |
| `value` | `bool` | Actually applied level |

```python
applied = robot.io.set_level(pin=17, value=True)
print(applied.outcome.success, applied.pin, applied.value)
```

### get_level

Read the current level of an acquired pin (`INPUT` or `OUTPUT`). Calling this on a pin that is not acquired will be rejected.

```python
get_level(*, pin: int, timeout_ms: int = 1000) -> PinLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pin` | `int` | (required) | Pin number; must be ≥ 0 |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`PinLevelAppliedT`: same fields as `set_level`; `value` is the level currently read.

```python
from fabot.capabilities.io import PinDirection

robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
robot.io.set_level(pin=17, value=True)
level = robot.io.get_level(pin=17)
print(level.value)
robot.io.release(pin=17)
```

## Channels

This module has no data channels. For the general channel model see [Events & Data Channels](../../usage/events-channels.md).

## Events

Subscribe via `robot.io.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event carries an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.io.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. The current `Faults` type has only `revision`; this module has no named faults yet — see [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.io.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.io.events.lifecycle_changed.subscribe(callback)`.

**Payload**

`LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot`:

| Field | Type | Description |
|-------|------|-------------|
| `lifecycle` | `LifecycleState` | Lifecycle phase |
| `health` | `HealthState` | Health |
| `source_instance_id` | `str` | Source instance id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.io.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.io.faults()`, which returns `Faults`.

This module has no named faults: the current `Faults` type has only `revision`. Changes are pushed via `fault_changed`. For the shared conventions see [Status, Faults & Lifecycle](../../usage/status-faults.md).

If named faults are added later, each entry is a `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `active` | `bool` | Whether it is still in effect |
| `catalog_id` | `str` | Catalog id |
| `fault_class` | `CapabilityStateClass` | Fault class |
| `first_seen_us` / `last_seen_us` | `int` | First / last seen timestamp (microseconds) |
| `count` | `int` | Cumulative count |

## Status

This module has no `status()`; for aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes go through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

All four methods are short-lived Commands. This module declares no exclusive resources: commands are not queued against each other. Acquire / read / write on different pins do not interfere; the same pin must be `acquire`d before I/O and `release`d afterwards.
