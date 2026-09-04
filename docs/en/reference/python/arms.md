---
title: Arms
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Arms

## Module Overview

- Capability id: `arms`; slot: `robot.arms`
- Dual-arm coordinated motion and control: dual-arm joint moves, dual-arm end-effector pose / path moves, interpolation-duration settings, impedance drag, dual-arm brakes, and relative pose hold.
- Cartesian dual-arm motion goes only through this module's `move_dual_arm_*`; do not run it in parallel with the single-arm `move_pose` on `robot.left_arm` / `robot.right_arm`.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[float]` | Command |
| `get_pose` | — | `DualArmPoseMoveT` | Command |
| `get_joints_velocity` | — | `float` | Command |
| `set_joints_velocity` | `velocity` | `JointsVelocityAppliedT` | Command |
| `get_poses_velocity` | — | `float` | Command |
| `set_poses_velocity` | `velocity` | `PosesVelocityAppliedT` | Command |
| `get_drag` | — | `DragStateT` | Command |
| `set_drag` | `open`, `mode` | `OutcomeT` | Command |
| `get_brake` | — | `BrakeStateT` | Command |
| `set_brake` | `left_open`, `right_open` | `OutcomeT` | Command |
| `set_relative_pose_hold` | `enabled` | `OutcomeT` | Command |
| `move_joints` | `positions`, `wait` | `MoveJointsOperation` | Operation |
| `move_dual_arm_pose` | `poses`, `wait`, `frame_id` | `MoveDualArmPoseOperation` | Operation |
| `move_dual_arm_path` | `poses`, `wait`, `frame_id` | `MoveDualArmPathOperation` | Operation |

Command default `timeout_ms`: 1000 for `get_joints` / `get_pose`, 2000 for the interpolation-duration and drag queries and `set_relative_pose_hold`, 5000 for `set_drag`, 10000 for `get_brake` / `set_brake` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Dual-arm joint-position stream (`JointPositionsT`) |
| `pose()` | Dual-arm end-effector pose stream (`DualArmPoseMoveT`) |

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### get_joints

Read the current dual-arm joint angles.

```python
get_joints(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[float]`: left-arm joint angles followed by right-arm joint angles (commonly 14 in total), in radians.

### get_pose

Read the current dual-arm end-effector poses.

```python
get_pose(*, timeout_ms: int = 1000) -> DualArmPoseMoveT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`DualArmPoseMoveT`:

| Field | Type | Description |
|-------|------|-------------|
| `poses` | `list[Pose3dT]` | Left- and right-arm end-effector poses in that order (`x` / `y` / `z` in meters, `qx` / `qy` / `qz` / `qw` orientation quaternion) |
| `wait` | `bool` | Reserved field |
| `frameId` | `str` | Pose reference frame |

### get_joints_velocity

Read the joint-move (MoveJ) interpolation duration.

```python
get_joints_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: current MoveJ interpolation duration in seconds.

### set_joints_velocity

Set the joint-move (MoveJ) interpolation duration; the setting persists.

```python
set_joints_velocity(*, velocity: float, timeout_ms: int = 2000) -> JointsVelocityAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity` | `float` | (required) | MoveJ interpolation duration in seconds |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`JointsVelocityAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `appliedVelocity` | `float` | Actually applied duration (seconds) |

```python
applied = robot.arms.set_joints_velocity(velocity=2.0)
print(applied.outcome.success, applied.appliedVelocity)
```

### get_poses_velocity

Read the end-effector move (MoveL) interpolation duration.

```python
get_poses_velocity(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`float`: current MoveL interpolation duration in seconds.

### set_poses_velocity

Set the end-effector move (MoveL) interpolation duration; the setting persists.

```python
set_poses_velocity(*, velocity: float, timeout_ms: int = 2000) -> PosesVelocityAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `velocity` | `float` | (required) | MoveL interpolation duration in seconds |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`PosesVelocityAppliedT`: `outcome` (`OutcomeT` \| `None`) / `appliedVelocity` (`float`, actually applied value in seconds).

### get_drag

Query the impedance-drag state.

```python
get_drag(*, timeout_ms: int = 2000) -> DragStateT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`DragStateT`:

| Field | Type | Description |
|-------|------|-------------|
| `open` | `bool` | Whether drag is open |
| `mode` | `DragMode` | Drag mode: `LOW_IMPEDANCE` or `HIGH_IMPEDANCE` |

### set_drag

Open or close impedance drag.

```python
set_drag(*, open: bool, mode: DragMode, timeout_ms: int = 5000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `bool` | (required) | `True` opens drag; `False` closes it |
| `mode` | `DragMode` | (required) | `LOW_IMPEDANCE` or `HIGH_IMPEDANCE` |
| `timeout_ms` | `int` | `5000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
from fabot.capabilities.arms import DragMode

outcome = robot.arms.set_drag(open=True, mode=DragMode.LOW_IMPEDANCE)
print(outcome.success, outcome.statusMessage)
```

### get_brake

Query the dual-arm brake state.

```python
get_brake(*, timeout_ms: int = 10000) -> BrakeStateT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`BrakeStateT`:

| Field | Type | Description |
|-------|------|-------------|
| `leftOpen` | `bool` | Whether the left-arm brake is open (released) |
| `rightOpen` | `bool` | Whether the right-arm brake is open (released) |

### set_brake

Open or close the left- and right-arm brakes independently.

```python
set_brake(*, left_open: bool, right_open: bool, timeout_ms: int = 10000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `left_open` | `bool` | (required) | `True` releases the left-arm brake; `False` engages it |
| `right_open` | `bool` | (required) | `True` releases the right-arm brake; `False` engages it |
| `timeout_ms` | `int` | `10000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
outcome = robot.arms.set_brake(left_open=True, right_open=True)
print(outcome.success, outcome.statusMessage)
```

### set_relative_pose_hold

Toggle dual-arm relative pose hold: when enabled, the relative pose between the two end-effectors stays fixed as the robot moves.

```python
set_relative_pose_hold(*, enabled: bool, timeout_ms: int = 2000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `bool` | (required) | `True` holds the relative pose; `False` releases it |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

### move_joints

Run a long-running dual-arm joint-space move. Returns a pollable, cancelable Operation.

```python
move_joints(*, positions: list[float], wait: bool) -> MoveJointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `positions` | `list[float]` | (required) | Target joint angles: left arm followed by right arm (commonly 14), in radians |
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
positions = robot.arms.get_joints()
positions[1] += 0.2
op = robot.arms.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_dual_arm_pose

Move both end-effectors smoothly to the given poses at the same time. Returns a pollable, cancelable Operation.

```python
move_dual_arm_pose(*, poses: list[Pose3dT], wait: bool, frame_id: str) -> MoveDualArmPoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `poses` | `list[Pose3dT]` | (required) | Must have length 2: left-arm target, then right-arm target |
| `wait` | `bool` | (required) | When `True`, the task finishes after arrival or timeout |
| `frame_id` | `str` | (required) | Pose reference frame: `arm_base` / `base_footprint` / `body_link4`; an empty string is equivalent to `arm_base` |

**Returns**

`MoveDualArmPoseOperation`. Snapshot fields match `move_joints`: `state` / `feedback: ProgressT` / `result: OutcomeT` / `error`. The handle supports `cancel()`.

```python
from fabot.types.Pose3d import Pose3dT

left = Pose3dT()
left.x, left.y, left.z = 0.3, 0.2, 0.4
left.qw = 1.0
right = Pose3dT()
right.x, right.y, right.z = 0.3, -0.2, 0.4
right.qw = 1.0
op = robot.arms.move_dual_arm_pose(poses=[left, right], wait=True, frame_id="arm_base")
```

### move_dual_arm_path

Move both end-effectors along smooth trajectories with multiple waypoints. Returns a pollable, cancelable Operation.

```python
move_dual_arm_path(*, poses: list[Pose3dT], wait: bool, frame_id: str) -> MoveDualArmPathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `poses` | `list[Pose3dT]` | (required) | Length must be even: the first half is the left-arm trajectory, the second half the right-arm trajectory |
| `wait` | `bool` | (required) | When `True`, the task finishes after arrival or timeout |
| `frame_id` | `str` | (required) | Pose reference frame: `arm_base` / `base_footprint` / `body_link4`; an empty string is equivalent to `arm_base` |

**Returns**

`MoveDualArmPathOperation`. Snapshot fields match `move_joints`: `state` / `feedback: ProgressT` / `result: OutcomeT` / `error`. The handle supports `cancel()`.

```python
op = robot.arms.move_dual_arm_path(
    poses=[left_p1, left_p2, right_p1, right_p2], wait=True, frame_id="arm_base",
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the dual-arm joint-position stream.

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
| `payload` | `JointPositionsT` | `payload.positions`: `list[float]`, left arm followed by right arm, radians |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.arms.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload.positions)
```

### pose()

Subscribe to the dual-arm end-effector pose stream.

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
| `payload` | `DualArmPoseMoveT` | `payload.poses`: `list[Pose3dT]`, left- then right-arm end-effector pose; `payload.frameId`: reference frame |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.arms.pose(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    left, right = frame.payload.poses
    print(left.x, left.y, left.z, right.x, right.y, right.z)
```

## Events

Subscribe via `robot.arms.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.arms.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.arms.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.arms.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.arms.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.arms.faults()`, which returns `Faults`.

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

`move_joints`, `move_dual_arm_pose`, and `move_dual_arm_path` share one resource; new tasks queue.
