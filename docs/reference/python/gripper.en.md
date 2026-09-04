---
title: Gripper
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Gripper

## Module Overview

- Capability id: `gripper`; slots: `robot.left_gripper` / `robot.right_gripper`
- Single-gripper opening-degree motion plus velocity / torque control. Left and right grippers share the same API on independent slots.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `ToolSpeedAppliedT` | Command |
| `get_torque` | — | `float` | Command |
| `set_torque` | `torque` | `TorqueAppliedT` | Command |
| `move_joints` | `positions`, `duration_s`, `position_threshold` | `MoveJointsOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints`, 2000 for the other Commands (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Gripper opening-degree stream (`JointPositionsT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### get_joints

Read the current opening degree.

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[float]`: opening degree of each joint; the length depends on the end-effector, and a common single-DOF gripper has length 1.

### get_velocity

Read the current persistent velocity scalar.

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: the velocity scalar currently in effect.

### set_velocity

Set the persistent velocity scalar, effective for subsequent `move_joints` calls.

```python
set_velocity(*, velocity: float, timeout_ms: int = 2000) -> ToolSpeedAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity` | `float` | (required) | Unsigned velocity scalar; must be a positive finite value |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`ToolSpeedAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | Velocity scalar actually applied |

```python
applied = robot.left_gripper.set_velocity(velocity=0.5)
print(applied.outcome.success, applied.appliedVelocity)
```

### get_torque

Read the current persistent torque scalar.

```python
get_torque(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: the torque scalar currently in effect.

### set_torque

Set the persistent torque scalar, effective for subsequent `move_joints` calls.

```python
set_torque(*, torque: float, timeout_ms: int = 2000) -> TorqueAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `torque` | `float` | (required) | Unsigned torque scalar; must be a non-negative finite value |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`TorqueAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedTorque` | `float` | Torque scalar actually applied |

```python
applied = robot.right_gripper.set_torque(torque=0.3)
print(applied.outcome.success, applied.appliedTorque)
```

### move_joints

Run an opening-degree move. Returns a pollable, cancelable Operation. Velocity and torque are not carried by this method; set them first via `set_velocity` / `set_torque`.

```python
move_joints(*, positions: list[float], duration_s: float, position_threshold: float) -> MoveJointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `positions` | `list[float]` | (required) | Target opening degree; the length depends on the end-effector, and a common single-DOF gripper has length 1 |
| `duration_s` | `float` | (required) | Arrival timeout for this move (seconds); a value greater than 0 overrides the default 5, pass `0.0` to use the default |
| `position_threshold` | `float` | (required) | Arrival threshold, in the same unit as `positions`; a value greater than 0 overrides the default 0.01, pass `0.0` to use the default |

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
robot.left_gripper.set_velocity(velocity=0.5)
robot.left_gripper.set_torque(torque=0.3)
op = robot.left_gripper.move_joints(positions=[0.8], duration_s=0.0, position_threshold=0.0)
for snap in op.events(poll_timeout_ms=200, timeout_ms=10000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the gripper opening-degree stream.

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
| `payload` | `JointPositionsT` | `payload.positions`: `list[float]`, opening degree of each joint |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.left_gripper.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## Events

Subscribe via `robot.left_gripper.events` / `robot.right_gripper.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.left_gripper.events.fault_changed.subscribe(callback)` (same on the right gripper).

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.left_gripper.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.left_gripper.events.lifecycle_changed.subscribe(callback)` (same on the right gripper).

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

token = robot.right_gripper.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.left_gripper.faults()` / `robot.right_gripper.faults()`, which return `Faults`.

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

On a given gripper, `move_joints` tasks share one motion resource; new tasks queue. Commands such as `get_*` / `set_*` do not take the resource.
