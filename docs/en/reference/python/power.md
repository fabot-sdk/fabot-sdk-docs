---
title: Power
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Power

## Module Overview

- Capability id: `power`; slots: `robot.power_1` / `robot.power_2`
- Domain: `power`; capability version: `1.1.0`
- Battery level, voltage, current, temperature and charging state. The two rails share the API on independent slots.
- The module has no Commands or Operations, only a status bag and the shared queries.

The `id` property gives the rail index (`power_1` is `"1"`).

## API Overview

| Name | Kind | Description |
|------|------|------|
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

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

`status()` returns the read-only status bag for this capability; see `robot.status()` for the aggregated view.

| Field | Type | Default | Description |
|------|------|------|------|
| `energy` | `int` | `0` | Battery level |
| `current` | `float` | `0.0` | Current |
| `voltage` | `float` | `0.0` | Voltage |
| `temperature` | `int` | `0` | Temperature |
| `is_charging` | `bool` | `False` | Whether charging |

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

The module only exposes read-only status and fault queries; no Commands, Operations or resource contention.
