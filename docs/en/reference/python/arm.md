---
title: Arm
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Arm

## Module Overview

- Capability id: `arm`; slots: `robot.left_arm` / `robot.right_arm`
- Single-arm joint motion and end-effector pose control. Left and right arms share the same API on independent slots.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_pose` | — | `Pose3dT` | Command |
| `get_brake` | — | `bool` | Command |
| `set_brake` | `open` | `OutcomeT` | Command |
| `set_enabled` | `enabled` | `OutcomeT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_pose` | `pose`, `mode`, `wait`, `frame_id` | `MovePoseOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints` / `get_pose`, 3000 for `set_enabled`, 10000 for `get_brake` / `set_brake` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Joint-position stream (`JointPositionsT`) |
| `pose()` | End-effector pose stream (`Pose3dT`) |

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

### get_pose

Read the current end-effector pose.

```python
get_pose(*, timeout_ms: int = 1000) -> Pose3dT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`Pose3dT`:

| Field | Type | Description |
|-------|------|-------------|
| `x` / `y` / `z` | `float` | Position in meters |
| `qx` / `qy` / `qz` / `qw` | `float` | Orientation quaternion |

### get_brake

Query whether the brake is open.

```python
get_brake(*, timeout_ms: int = 10000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`bool`: `True` means the brake is open (released); `False` means it is closed.

### set_brake

Open or close the brake.

```python
set_brake(*, open: bool, timeout_ms: int = 10000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `bool` | (required) | `True` releases the brake; `False` engages it |
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `bool` | Whether the command succeeded |
| `statusMessage` | `str` | Status text |

```python
outcome = robot.left_arm.set_brake(open=True)
print(outcome.success, outcome.statusMessage)
```

### set_enabled

Enable or disable this arm.

```python
set_enabled(*, enabled: bool, timeout_ms: int = 3000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `bool` | (required) | `True` enables the arm; `False` disables it |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
outcome = robot.left_arm.set_enabled(enabled=True)
print(outcome.success, outcome.statusMessage)
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
positions = robot.left_arm.get_joints()
positions[1] += 0.2
op = robot.left_arm.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_pose

Run a long-running end-effector pose move. Returns a pollable, cancelable Operation.

```python
move_pose(*, pose: Pose3dT, mode: PoseMoveMode, wait: bool, frame_id: str) -> MovePoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pose` | `Pose3dT` | (required) | Target pose: `x` / `y` / `z` (meters), `qx` / `qy` / `qz` / `qw` |
| `mode` | `PoseMoveMode` | (required) | `SMOOTH` or `DIRECT` |
| `wait` | `bool` | (required) | When `True`, the task finishes after arrival or timeout |
| `frame_id` | `str` | (required) | Pose reference frame; an empty string is equivalent to `arm_base` |

**Returns**

`MovePoseOperation`. Snapshot fields match `move_joints`: `state` / `feedback: ProgressT` / `result: OutcomeT` / `error`. The handle supports `cancel()`.

```python
from fabot.capabilities.arm import PoseMoveMode
from fabot.types.Pose3d import Pose3dT

pose = Pose3dT()
pose.x, pose.y, pose.z = 0.3, 0.0, 0.4
pose.qw = 1.0
op = robot.right_arm.move_pose(
    pose=pose, mode=PoseMoveMode.SMOOTH, wait=True, frame_id="arm_base",
)
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
ch = robot.left_arm.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

### pose()

Subscribe to the end-effector pose stream.

```python
pose(qos_profile: str = "latest") -> PoseChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`PoseChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `Pose3dT` | `x` / `y` / `z` (meters), `qx` / `qy` / `qz` / `qw` |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.right_arm.pose(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.x, frame.payload.y, frame.payload.z)
```

## Events

Subscribe via `robot.left_arm.events` / `robot.right_arm.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.left_arm.events.fault_changed.subscribe(callback)` (same on the right arm).

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.left_arm.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.left_arm.events.lifecycle_changed.subscribe(callback)` (same on the right arm).

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

token = robot.right_arm.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.left_arm.faults()` / `robot.right_arm.faults()`, which return `Faults`.

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

On a given arm, `move_joints` and `move_pose` share one resource; new tasks queue.
