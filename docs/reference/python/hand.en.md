---
title: Hand
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Hand

## Module Overview

- Capability id: `hand`; slots: `robot.left_hand` / `robot.right_hand`
- Single-hand multi-finger joint aperture control, with speed and torque settings. Left and right hands share the same API on independent slots.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `ToolSpeedAppliedT` | Command |
| `get_torque` | — | `float` | Command |
| `set_torque` | `torque` | `TorqueAppliedT` | Command |
| `move_joints` | `positions`, `duration_s`, `position_threshold` | `MoveJointsOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints`, 2000 for `get_velocity` / `set_velocity` / `get_torque` / `set_torque` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Joint-aperture stream (`JointPositionsT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

Joint apertures are recommended to be normalized to 0~1: 0 means flexed/closed, 1 means extended/open; the list length depends on the hand model.

### get_joints

Read the current joint apertures.

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[float]`: joint apertures, recommended normalized 0~1.

```python
positions = robot.left_hand.get_joints()
print(positions)
```

### get_velocity

Read the current persistent speed scalar.

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: the current speed scalar.

### set_velocity

Set the persistent speed scalar; affects subsequent `move_joints` calls.

```python
set_velocity(*, velocity: float, timeout_ms: int = 2000) -> ToolSpeedAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity` | `float` | (required) | Unsigned speed scalar; must be a positive finite value |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`ToolSpeedAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | The speed scalar actually applied |

```python
applied = robot.left_hand.set_velocity(velocity=0.5)
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

`float`: the current torque scalar.

### set_torque

Set the persistent torque scalar; affects subsequent `move_joints` calls.

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
| `appliedTorque` | `float` | The torque scalar actually applied |

```python
applied = robot.left_hand.set_torque(torque=0.3)
print(applied.outcome.success, applied.appliedTorque)
```

### move_joints

Run a long-running move toward target apertures. Returns a pollable, cancelable Operation. Speed and torque are not carried by this method; set them first with `set_velocity` / `set_torque`.

```python
move_joints(*, positions: list[float], duration_s: float, position_threshold: float) -> MoveJointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `positions` | `list[float]` | (required) | Target apertures, recommended normalized 0~1 |
| `duration_s` | `float` | (required) | Arrival timeout for this move (seconds); `0` uses the system default and only bounds the wait |
| `position_threshold` | `float` | (required) | Arrival threshold for this move, same unit as `positions`; `0` uses the system default |

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
robot.left_hand.set_velocity(velocity=0.5)
op = robot.left_hand.move_joints(
    positions=[0.0, 0.0, 0.0, 0.0, 0.0], duration_s=5.0, position_threshold=0.02,
)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the joint-aperture stream.

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
| `payload` | `JointPositionsT` | `payload.positions`: `list[float]`, joint apertures |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.right_hand.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## Events

Subscribe via `robot.left_hand.events` / `robot.right_hand.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.left_hand.events.fault_changed.subscribe(callback)` (same on the right hand).

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.left_hand.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.left_hand.events.lifecycle_changed.subscribe(callback)` (same on the right hand).

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

token = robot.right_hand.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.left_hand.faults()` / `robot.right_hand.faults()`, which return `Faults`.

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

On a given hand, `move_joints` holds that hand's resource exclusively; new tasks queue.
