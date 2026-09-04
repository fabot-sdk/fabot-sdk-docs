---
title: Teleop
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Teleop

## Module Overview

- Capability id: `teleop`; slot: `robot.teleop`
- Establishment and teardown of remote teleoperation (joystick) control sessions. The robot has a single teleop slot.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `start_joystick_control` | — | `StartJoystickControlOperation` | Operation |
| `stop_joystick_control` | — | `OutcomeT` | Command |

Command default `timeout_ms`: 10000 for `stop_joystick_control` (overridable). All parameters are keyword-only.

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### start_joystick_control

Establish a joystick teleoperation session. Returns a pollable, cancelable Operation. While the session is active, remote control data is ingested continuously; canceling the Operation ends the session.

```python
start_joystick_control() -> StartJoystickControlOperation
```

**Parameters**

None.

**Returns**

`StartJoystickControlOperation`. Use `get()` / `events()` for snapshots, or `cancel()`. The session has a default time limit and enters a terminal state when it expires. Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether the snapshot is terminal |
| `feedback` | `ProgressT` \| `None` | `progress` (`float`), `statusMessage` (`str`) |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | Failure reason |

```python
op = robot.teleop.start_joystick_control()
for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### stop_joystick_control

Stop the current joystick teleoperation session.

```python
stop_joystick_control(*, timeout_ms: int = 10000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `bool` | Whether the command succeeded |
| `statusMessage` | `str` | Status text |

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.statusMessage)
```

## Channels

This module has no data channels. Teleoperation sessions are established and ended through the methods above, and session progress and results come from Operation snapshots; see [Events & Data Channels](../../usage/events-channels.md) for general channel usage.

## Events

Subscribe via `robot.teleop.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.teleop.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.teleop.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.teleop.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.teleop.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.teleop.faults()`, which returns `Faults`.

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

This module has no `status()`. For aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

Teleoperation control is an exclusive resource: only one joystick session may be active at a time. Calling `start_joystick_control` while a session is running is rejected outright (no queuing); call `stop_joystick_control` or wait for the session to end before starting a new one.
