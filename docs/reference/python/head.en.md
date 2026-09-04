---
title: Head
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Head

## Module Overview

- Capability id: `head`; slot: `robot.head`
- Head pitch / yaw motion control.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `VelocityAppliedT` | Command |
| `check_arrive` | `threshold`, `target_joints` | `bool` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints` / `check_arrive`, 2000 for `get_velocity` / `set_velocity` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Joint-position stream (`JointPositionsT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### get_joints

Read the current joint angles.

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[float]`: joint angles in radians.

```python
positions = robot.head.get_joints()
print(positions)
```

### get_velocity

Read the current interpolation-duration setting.

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: the persistent MoveJ interpolation duration in seconds; larger values mean slower motion.

```python
print(robot.head.get_velocity())
```

### set_velocity

Set the interpolation duration; applies persistently to all subsequent moves.

```python
set_velocity(*, velocity: float, timeout_ms: int = 2000) -> VelocityAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity` | `float` | (required) | Interpolation duration in seconds; must be positive and finite, larger values mean slower motion |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`VelocityAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | Interpolation duration actually applied (seconds) |

```python
applied = robot.head.set_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### check_arrive

Check whether the head has reached the target joint angles.

```python
check_arrive(*, threshold: float, target_joints: list[float], timeout_ms: int = 1000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `threshold` | `float` | (required) | Joint-space L2 tolerance in radians |
| `target_joints` | `list[float]` | (required) | Target joint angles (radians); pass an empty list to use the target of the most recent `move_joints` |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`bool`: `True` means the target has been reached.

```python
arrived = robot.head.check_arrive(threshold=0.05, target_joints=[])
print(arrived)
```

### move_joints

Run a long-running joint-space move. Returns a pollable, cancelable Operation.

```python
move_joints(*, positions: list[float], wait: bool) -> MoveJointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `positions` | `list[float]` | (required) | Target joint angles in radians |
| `wait` | `bool` | (required) | When `True`, the task finishes after arrival or timeout |

**Returns**

`MoveJointsOperation`. Use `get()` / `events()` for snapshots, or `cancel()`. Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether the snapshot is terminal |
| `feedback` | `ProgressT` \| `None` | `progress` (`float`), `statusMessage` (`str`) |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | Failure reason |

```python
positions = robot.head.get_joints()
positions[0] += 0.2
op = robot.head.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the joint-position stream.

```python
joints(qos_profile: str = "latest") -> JointsChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`JointsChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `JointPositionsT` | `payload.positions`: `list[float]`, radians |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.head.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## Events

Subscribe via `robot.head.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.head.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.head.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.head.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.head.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.head.faults()`, which returns `Faults`.

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

`move_joints` takes the head-motion resource; new tasks on the same slot queue.
