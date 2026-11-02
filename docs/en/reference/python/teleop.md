---
title: Teleop
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Teleop

## Module Overview

- Capability id: `teleop`; slots: `robot.teleop`
- Domain: `motion`; capability version: `1.1.0`
- Start and stop a joystick teleop session. The robot has exactly one teleop slot.
- The session is itself a long-running Operation; cancelling it ends the session.

The `joystick_control` resource uses policy `reject`: a second start during a session fails immediately instead of queueing. Stop the session or wait for it to end first.

## API Overview

| Name | Kind | Description |
|------|------|------|
| `stop_joystick_control` | Command | Stop the current session; default timeout 10000 ms. |
| `start_joystick_control` | Operation | Start a joystick session and return a pollable, cancelable Operation; default budget 45 s. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### stop_joystick_control

Stop the current session.

```python
stop_joystick_control(*, timeout_ms: int = 10000) -> Outcome
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Timeout in milliseconds |

**Returns** `Outcome`

| Field | Type | Description |
|------|------|------|
| `success` | `bool` | Whether the call succeeded |
| `status_message` | `str` | Status text |

### start_joystick_control

Start a joystick session and return a pollable, cancelable Operation. The session has a 45-second default budget and ends automatically.

```python
start_joystick_control() -> StartJoystickControlOperation
```

Returns a `StartJoystickControlOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
robot.teleop.start_joystick_control()
# ... 手柄操作 ...
robot.teleop.stop_joystick_control()
```

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

Joystick control is exclusive with policy `reject`: only one session at a time, and a second start is rejected outright.
