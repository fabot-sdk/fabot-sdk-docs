---
title: Power
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Power

## Module Overview

- Capability id: `power`; slots: `robot.power_1` / `robot.power_2`
- Battery energy, voltage, current, temperature, and charging-state monitoring. Both power slots share the same API on independent slots.

## API Overview

This module has no Commands or Operations and no data channels; the read-only queries `status()` / `health()` / `lifecycle()` / `faults()` are covered in [Status](#status) and [Faults](#faults).

## Methods

This module has no Commands or Operations.

Read-only queries:

- `status()`: power status snapshot, see [Status](#status)
- `health()` / `lifecycle()` / `faults()`: shared queries, see [Status](#status) and [Faults](#faults)

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md) for the shared channel model.

## Events

Subscribe via `robot.power_1.events` / `robot.power_2.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.power_1.events.fault_changed.subscribe(callback)` (same on `power_2`).

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.power_1.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.power_1.events.lifecycle_changed.subscribe(callback)` (same on `power_2`).

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

token = robot.power_2.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.power_1.faults()` / `robot.power_2.faults()`, which return `Faults`.

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

Read the current power status snapshot:

```python
status() -> Status
```

`status()` takes no parameters and returns a `Status`:

| Field | Type | Description |
|-------|------|-------------|
| `energy` | `int` | Battery energy |
| `current` | `float` | Current |
| `voltage` | `float` | Voltage |
| `temperature` | `int` | Temperature |
| `is_charging` | `bool` | Whether the battery is charging |

```python
st = robot.power_1.status()
print(st.energy, st.voltage, st.is_charging)
```

For aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

This module only offers read-only status and fault queries; it has no Commands or Operations, so there is no resource acquisition, queuing, or rejection.
