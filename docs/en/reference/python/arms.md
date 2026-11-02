---
title: Arms
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Arms

## Module Overview

- Capability id: `arms`; slots: `robot.arms`
- Domain: `motion`; capability version: `1.1.0`
- Coordinated dual-arm motion: coupling mode, impedance drag, relative poses and synchronized trajectories. Left and right data are paired in one call.
- `ArmsMode.COUPLED` holds the relative end-effector pose captured when coupling is enabled; `ImpedanceMode` supports guided drag teaching.

All motion Operations share the `arms` resource with policy `queue`.

## API Overview

| Name | Kind | Description |
|------|------|------|
| `get_joint` | Command | Read both arm joint samples; `left` / `right` share one timestamp; default timeout 1000 ms. |
| `get_pose` | Command | Read both end-effector poses; default timeout 1000 ms. |
| `get_mode` | Command | Read the current mode; default timeout 1000 ms. |
| `set_mode` | Command | Switch the arm coupling mode and return the applied mode; default timeout 2000 ms. |
| `get_impedance` | Command | Read the impedance drag mode; default timeout 2000 ms. |
| `set_impedance` | Command | Switch the impedance drag mode; `DISABLED` restores rigid position control; default timeout 5000 ms. |
| `get_brake` | Command | Query the brake state; default timeout 10000 ms. |
| `set_brake` | Command | Release or engage both brakes and return both sides; default timeout 10000 ms. |
| `get_joint_velocity_limit` | Command | Read the joint velocity limit; default timeout 2000 ms. |
| `set_joint_velocity_limit` | Command | Set the joint velocity limit and return the applied value; default timeout 2000 ms. |
| `get_linear_velocity_limit` | Command | Read the linear velocity limit; default timeout 2000 ms. |
| `set_linear_velocity_limit` | Command | Set the linear velocity limit and return the applied value; default timeout 2000 ms. |
| `get_angular_velocity_limit` | Command | Read the angular velocity limit; default timeout 2000 ms. |
| `set_angular_velocity_limit` | Command | Set the angular velocity limit and return the applied value; default timeout 2000 ms. |
| `get_joint_acceleration_limit` | Command | Read the joint acceleration limit; default timeout 2000 ms. |
| `set_joint_acceleration_limit` | Command | Set the joint acceleration limit and return the applied value; default timeout 2000 ms. |
| `get_linear_acceleration_limit` | Command | Read the linear acceleration limit; default timeout 2000 ms. |
| `set_linear_acceleration_limit` | Command | Set the linear acceleration limit and return the applied value; default timeout 2000 ms. |
| `get_angular_acceleration_limit` | Command | Read the angular acceleration limit; default timeout 2000 ms. |
| `set_angular_acceleration_limit` | Command | Set the angular acceleration limit and return the applied value; default timeout 2000 ms. |
| `servo_pose` | Command | Dual-arm pose servo returning the applied poses; default timeout 1000 ms. |
| `get_arrival_thresholds` | Command | Read the arrival thresholds for this slot; default timeout 1000 ms. |
| `set_arrival_thresholds` | Command | Replace the arrival thresholds for this slot; default timeout 1000 ms. |
| `move_joint` | Operation | Joint-space motion. |
| `move_joint_path` | Operation | Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints. |
| `move_pose` | Operation | Absolute end-effector motion. |
| `move_pose_relative` | Operation | Relative end-effector motion; `target` is an increment from the current pose. |
| `move_pose_path` | Operation | Follow an end-effector waypoint sequence; each waypoint carries its own `frame_id`. |
| `move_pose_arc_by_points` | Operation | Arc through three points: from the current pose through `via` to `end`. |
| `move_pose_arc_by_center` | Operation | Center arc motion; the center is located in `center.frame_id`. |
| `joint` | Channel | Dual-arm joint-state stream; frame is `DualJointState`. |
| `pose` | Channel | Dual-arm pose stream; frame is `DualPose`. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

Enums used on this page:

**`ArmsMode` enum**

| Value | Description |
|-------|-------------|
| `INDEPENDENT` | Arms move independently |
| `COUPLED` | Hold the relative end-effector pose captured on coupling |

**`ImpedanceMode` enum**

| Value | Description |
|-------|-------------|
| `DISABLED` | Disable guided drag and restore rigid position control |
| `LOW` | Low-stiffness compliance |
| `HIGH` | High-stiffness compliance |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_joint

Read both arm joint samples; `left` / `right` share one timestamp.

```python
get_joint(*, timeout_ms: int = 1000) -> DualJointState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `DualJointState`

| Field | Type | Description |
|------|------|------|
| `left` | `JointState` | Left |
| `right` | `JointState` | Right |

```python
state = robot.arms.get_joint()
print(state.left.positions, state.right.positions)
```

### get_pose

Read both end-effector poses.

```python
get_pose(*, frame_id: str = "", end_frame: str = "", timeout_ms: int = 1000) -> DualPose
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `DualPose`

| Field | Type | Description |
|------|------|------|
| `left` | `Pose3d` | Left |
| `right` | `Pose3d` | Right |

### get_mode

Read the current mode.

```python
get_mode(*, timeout_ms: int = 1000) -> ArmsMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArmsMode`

The proxy unwraps `Mode` into `ArmsMode`.

**`ArmsMode` enum**

| Value | Description |
|-------|-------------|
| `INDEPENDENT` | Arms move independently |
| `COUPLED` | Hold the relative end-effector pose captured on coupling |

### set_mode

Switch the arm coupling mode and return the applied mode.

```python
set_mode(mode: ArmsMode, *, timeout_ms: int = 2000) -> ArmsMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `ArmsMode` | (required) | Mode value |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `ArmsMode`

The proxy unwraps `Mode` into `ArmsMode`.

### get_impedance

Read the impedance drag mode.

```python
get_impedance(*, timeout_ms: int = 2000) -> ImpedanceMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `ImpedanceMode`

The proxy unwraps `Impedance` into `ImpedanceMode`.

### set_impedance

Switch the impedance drag mode; `DISABLED` restores rigid position control.

```python
set_impedance(mode: ImpedanceMode, *, timeout_ms: int = 5000) -> ImpedanceMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `ImpedanceMode` | (required) | Mode value |
| `timeout_ms` | `int` | `5000` | Timeout in milliseconds |

**Returns** `ImpedanceMode`

The proxy unwraps `Impedance` into `ImpedanceMode`.

```python
from fabot.capabilities.arms import ImpedanceMode

robot.arms.set_impedance(ImpedanceMode.LOW)   # 轻导纳拖拽示教
# ... 手动拖动双臂 ...
robot.arms.set_impedance(ImpedanceMode.DISABLED)
```

### get_brake

Query the brake state.

```python
get_brake(*, timeout_ms: int = 10000) -> DualBrakeState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Timeout in milliseconds |

**Returns** `DualBrakeState`

| Field | Type | Description |
|------|------|------|
| `left_open` | `bool` | Whether the left brake is released |
| `right_open` | `bool` | Whether the right brake is released |

### set_brake

Release or engage both brakes and return both sides.

```python
set_brake(open: bool, *, timeout_ms: int = 10000) -> DualBrakeState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `open` | `bool` | (required) | `True` releases the brake, `False` engages it |
| `timeout_ms` | `int` | `10000` | Timeout in milliseconds |

**Returns** `DualBrakeState`

| Field | Type | Description |
|------|------|------|
| `left_open` | `bool` | Whether the left brake is released |
| `right_open` | `bool` | Whether the right brake is released |

### get_joint_velocity_limit

Read the joint velocity limit.

```python
get_joint_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_joint_velocity_limit

Set the joint velocity limit and return the applied value.

```python
set_joint_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Joint velocity limit |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_linear_velocity_limit

Read the linear velocity limit.

```python
get_linear_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_velocity_limit

Set the linear velocity limit and return the applied value.

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear velocity limit in m/s |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_velocity_limit

Read the angular velocity limit.

```python
get_angular_velocity_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_velocity_limit

Set the angular velocity limit and return the applied value.

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular velocity limit in rad/s |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_joint_acceleration_limit

Read the joint acceleration limit.

```python
get_joint_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_joint_acceleration_limit

Set the joint acceleration limit and return the applied value.

```python
set_joint_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Joint acceleration limit |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_linear_acceleration_limit

Read the linear acceleration limit.

```python
get_linear_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_acceleration_limit

Set the linear acceleration limit and return the applied value.

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear acceleration limit in m/s² |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_acceleration_limit

Read the angular acceleration limit.

```python
get_angular_acceleration_limit(*, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_acceleration_limit

Set the angular acceleration limit and return the applied value.

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 2000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular acceleration limit in rad/s² |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_pose

Dual-arm pose servo returning the applied poses.

```python
servo_pose(*, left: Pose3d, right: Pose3d, timeout_ms: int = 1000) -> DualPose
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `left` | `Pose3d` | (required) |  |
| `right` | `Pose3d` | (required) |  |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `DualPose`

| Field | Type | Description |
|------|------|------|
| `left` | `Pose3d` | Left |
| `right` | `Pose3d` | Right |

### get_arrival_thresholds

Read the arrival thresholds for this slot.

```python
get_arrival_thresholds(*, timeout_ms: int = 1000) -> ArrivalThresholds
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArrivalThresholds`

| Field | Type | Description |
|------|------|------|
| `joint_tolerance` | `float` | Joint arrival tolerance in radians; must be finite and positive |
| `pose_position_tolerance` | `float` | Pose position tolerance in meters; must be finite and positive |
| `pose_orientation_tolerance` | `float` | Pose orientation error as `1 - |dot(q, q_target)|`, not radians |
| `max_timeout_s` | `float` | Extra arrival budget in seconds added to the motion duration |

### set_arrival_thresholds

Replace the arrival thresholds for this slot. The change is in-memory only and applies to later motions.

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, pose_position_tolerance: float = 0.02, pose_orientation_tolerance: float = 0.05, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholds
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | Joint arrival tolerance in radians |
| `pose_position_tolerance` | `float` | `0.02` | Pose position tolerance in meters |
| `pose_orientation_tolerance` | `float` | `0.05` | Pose orientation error as `1 - |dot(q, q_target)|` |
| `max_timeout_s` | `float` | `5.0` | Extra arrival budget in seconds |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArrivalThresholds`

| Field | Type | Description |
|------|------|------|
| `joint_tolerance` | `float` | Joint arrival tolerance in radians; must be finite and positive |
| `pose_position_tolerance` | `float` | Pose position tolerance in meters; must be finite and positive |
| `pose_orientation_tolerance` | `float` | Pose orientation error as `1 - |dot(q, q_target)|`, not radians |
| `max_timeout_s` | `float` | Extra arrival budget in seconds added to the motion duration |

### move_joint

Joint-space motion. `tolerance` is the arrival tolerance, `duration` the requested time, `wait_timeout` the extra arrival wait; 0 uses the defaults.

```python
move_joint(target: DualJoints, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `DualJoints` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_joint_path

Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints.

```python
move_joint_path(waypoints: list[DualJoints], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[DualJoints]` | (required) | Waypoints, at least two |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointPathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose

Absolute end-effector motion. The reference frame comes from `target.frame_id` (empty uses the slot base); `end_frame` empty uses the active TCP or flange.

```python
move_pose(target: DualPose, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `DualPose` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_relative

Relative end-effector motion; `target` is an increment from the current pose.

```python
move_pose_relative(target: DualPose, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseRelativeOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `DualPose` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseRelativeOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_path

Follow an end-effector waypoint sequence; each waypoint carries its own `frame_id`.

```python
move_pose_path(waypoints: list[DualPose], *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePosePathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[DualPose]` | (required) | Waypoints, at least two |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePosePathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_arc_by_points

Arc through three points: from the current pose through `via` to `end`.

```python
move_pose_arc_by_points(target: DualPoseArcByPoints, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByPointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `DualPoseArcByPoints` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseArcByPointsOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_arc_by_center

Center arc motion; the center is located in `center.frame_id`.

```python
move_pose_arc_by_center(target: DualPoseArcByCenter, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByCenterOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `DualPoseArcByCenter` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseArcByCenterOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### joint()

Dual-arm joint-state stream.

```python
joint(qos_profile: str = "latest") -> Channel
```

Frame payload is `DualJointState`:

| Field | Type | Description |
|------|------|------|
| `left` | `JointState` | Left |
| `right` | `JointState` | Right |

### pose()

Dual-arm pose stream.

```python
pose(qos_profile: str = "latest") -> Channel
```

Frame payload is `DualPose`:

| Field | Type | Description |
|------|------|------|
| `left` | `Pose3d` | Left |
| `right` | `Pose3d` | Right |

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

`move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center` share the `arms` resource with policy `queue`.
