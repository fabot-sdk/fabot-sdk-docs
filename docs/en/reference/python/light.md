---
title: Light
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Light

## Module Overview

- Capability id: `light`; slot: `robot.light`
- Light-strip control: lighting mode, color, brightness, and animation period. All five methods are short commands; write commands return the applied strip snapshot.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `set_mode` | `mode`, `color`, `period_ms` | `LightStatusAppliedT` | Command |
| `set_color` | `r`, `g`, `b` | `LightStatusAppliedT` | Command |
| `set_brightness` | `brightness` | `LightStatusAppliedT` | Command |
| `set_period` | `period_ms` | `LightStatusAppliedT` | Command |
| `get_status` | — | `LightStatusAppliedT` | Command |

Command default `timeout_ms` is 1000 for all methods (overridable). All parameters are keyword-only.

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

`LightMode` enum:

| Value | Description |
|-------|-------------|
| `OFF` | Lights off (color ignored) |
| `SOLID` | Solid on |
| `BLINK` | Blinking |
| `BREATHE` | Breathing |
| `RAINBOW` | Rainbow (color ignored) |
| `CHASE` | Chase |

`UNKNOWN` is not a legal command value and is rejected.

Write commands and `get_status` all return `LightStatusAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `status` | `LightStatusT` \| `None` | Applied strip snapshot |

`LightStatusT`:

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `LightMode` | Current lighting mode |
| `color` | `Rgb8T` | Current color: `r` / `g` / `b`, each 0–255 |
| `brightness` | `int` | Brightness, 0–255 |
| `periodMs` | `int` | Animation period (milliseconds) |
| `ledCount` | `int` | Number of LEDs on the strip |

### set_mode

Switch the lighting mode, setting color and animation period at the same time; brightness is unchanged.

```python
set_mode(*, mode: LightMode, color: Rgb8T, period_ms: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `LightMode` | (required) | Lighting mode; `OFF` / `RAINBOW` ignore the color |
| `color` | `Rgb8T` | (required) | Color: `r` / `g` / `b`, each 0–255 |
| `period_ms` | `int` | (required) | Animation period (milliseconds); no visible effect for `OFF` / `SOLID` |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`LightStatusAppliedT`: `outcome` / `status`, fields as above.

```python
from fabot.capabilities.light import LightMode
from fabot.types.Rgb8 import Rgb8T

color = Rgb8T()
color.r, color.g, color.b = 255, 0, 0
applied = robot.light.set_mode(mode=LightMode.BREATHE, color=color, period_ms=2000)
print(applied.outcome.success, applied.status.mode, applied.status.periodMs)
```

### set_color

Change the color only; the mode is unchanged.

```python
set_color(*, r: int, g: int, b: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `r` / `g` / `b` | `int` | (required) | Color components, each 0–255 |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`LightStatusAppliedT`: `outcome` / `status`.

```python
applied = robot.light.set_color(r=0, g=255, b=0)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### set_brightness

Change the brightness only; the mode is unchanged.

```python
set_brightness(*, brightness: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `brightness` | `int` | (required) | Brightness, 0–255 |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`LightStatusAppliedT`: `outcome` / `status`.

```python
applied = robot.light.set_brightness(brightness=128)
print(applied.outcome.success, applied.status.brightness)
```

### set_period

Change the animation period only; the mode is unchanged. No visible effect for `OFF` / `SOLID`.

```python
set_period(*, period_ms: int, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `period_ms` | `int` | (required) | Animation period (milliseconds) |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`LightStatusAppliedT`: `outcome` / `status`.

```python
applied = robot.light.set_period(period_ms=500)
print(applied.outcome.success, applied.status.periodMs)
```

### get_status

Read the current strip snapshot.

```python
get_status(*, timeout_ms: int = 1000) -> LightStatusAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`LightStatusAppliedT`: the current snapshot is in the `status` field.

```python
applied = robot.light.get_status()
status = applied.status
print(status.mode, status.brightness, status.periodMs, status.ledCount)
print(status.color.r, status.color.g, status.color.b)
```

## Channels

This module has no data channels. Query strip state with `get_status`; fault and lifecycle changes arrive as events, see below.

## Events

Subscribe via `robot.light.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.light.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.light.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.light.events.lifecycle_changed.subscribe(callback)`.

**Payload**

`LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot`:

| Field | Type | Description |
|-------|------|-------------|
| `lifecycle` | `LifecycleState` | Lifecycle stage |
| `health` | `HealthState` | Health |
| `source_instance_id` | `str` | Source instance id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.light.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.light.faults()`, which returns `Faults`.

This module has no named faults yet: `Faults` currently only exposes `revision`. Changes are pushed on `fault_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md) for the shared model.

If named faults appear later, each one is a `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `active` | `bool` | Whether the fault is still standing |
| `catalog_id` | `str` | Catalog id |
| `fault_class` | `CapabilityStateClass` | Fault class |
| `first_seen_us` / `last_seen_us` | `int` | First / last seen timestamp (microseconds) |
| `count` | `int` | Occurrence count |

## Status

This module has no `status()`. Query strip state with `get_status` above; for aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

All five methods are short commands with no long-running tasks; the module declares no exclusive resources, so commands are not queued or mutually excluded.
