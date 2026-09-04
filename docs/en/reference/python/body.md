---
title: Body
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Body

## Module Overview

- Capability id: `body`; slot: `robot.body`
- Body joint motion and waist lift / turn control.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_velocity` | — | `float` | Command |
| `set_velocity` | `velocity` | `VelocityAppliedT` | Command |
| `set_waist_lift_velocity` | `velocity_scale` | `WaistLiftVelocityAppliedT` | Command |
| `set_waist_turn_velocity` | `velocity_scale` | `WaistTurnVelocityAppliedT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_waist` | `mode`, `x`, `z`, `phi`, `wait` | `MoveWaistOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints`, 2000 for `get_velocity` / `set_velocity`, 1000 for `set_waist_lift_velocity` / `set_waist_turn_velocity` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Joint-position stream (`JointPositionsT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### get_joints

Read the current body joint angles.

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[float]`: joint angles in radians.

### get_velocity

Read the current interpolation duration of joint motion.

```python
get_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: interpolation duration of joint motion in seconds; larger values mean slower motion.

### set_velocity

Set the interpolation duration of joint motion; persists until changed.

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
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | Actually applied interpolation duration (seconds) |

```python
applied = robot.body.set_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### set_waist_lift_velocity

Drive waist lifting with a normalized scale; send 0 to stop.

```python
set_waist_lift_velocity(*, velocity_scale: float, timeout_ms: int = 1000) -> WaistLiftVelocityAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity_scale` | `float` | (required) | Velocity scale `[-1, 1]`; positive lifts up, negative lowers, `0` stops |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`WaistLiftVelocityAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedVelocityScale` | `float` | Actually applied velocity scale |

```python
robot.body.set_waist_lift_velocity(velocity_scale=0.5)
# stop after reaching the target height
robot.body.set_waist_lift_velocity(velocity_scale=0.0)
```

### set_waist_turn_velocity

Drive waist turning with a normalized scale; send 0 to stop.

```python
set_waist_turn_velocity(*, velocity_scale: float, timeout_ms: int = 1000) -> WaistTurnVelocityAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity_scale` | `float` | (required) | Velocity scale `[-1, 1]`; `0` stops |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`WaistTurnVelocityAppliedT`: `outcome` / `appliedVelocityScale`, same field semantics as `set_waist_lift_velocity`.

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
positions = robot.body.get_joints()
positions[0] += 0.1
op = robot.body.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_waist

Run a long-running waist pose move. Returns a pollable, cancelable Operation.

```python
move_waist(*, mode: WaistMoveMode, x: float, z: float, phi: float, wait: bool) -> MoveWaistOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `WaistMoveMode` | (required) | `ABSOLUTE` (absolute pose) or `RELATIVE` (relative increment) |
| `x` | `float` | (required) | `ABSOLUTE`: x in `base_footprint`; `RELATIVE`: dx. Meters |
| `z` | `float` | (required) | `ABSOLUTE`: z in `base_footprint`; `RELATIVE`: dz. Meters |
| `phi` | `float` | (required) | `ABSOLUTE`: body heading angle; `RELATIVE`: dphi. Radians |
| `wait` | `bool` | (required) | When `True`, the task finishes after arrival or timeout |

For a pure lift, use `mode=RELATIVE` and set only `z` (`x=0, phi=0`).

**Returns**

`MoveWaistOperation`. Snapshot fields match `move_joints`: `state` / `feedback: ProgressT` / `result: OutcomeT` / `error`. The handle supports `cancel()`.

```python
from fabot.capabilities.body import WaistMoveMode

op = robot.body.move_waist(
    mode=WaistMoveMode.RELATIVE, x=0.0, z=0.05, phi=0.0, wait=True,
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the body joint-position stream.

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
ch = robot.body.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

## Events

Subscribe via `robot.body.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.body.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.body.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.body.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.body.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.body.faults()`, which returns `Faults`.

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

`move_joints` and `move_waist` share one body resource; new tasks queue.
