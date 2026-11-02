---
title: Head
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Head

## Module Overview

- Capability id: `head`; slots: `robot.head`
- Domain: `motion`; capability version: `1.1.0`
- Head yaw / pitch motion: joint goals, pose motion, pose servo and the head constraint mode under whole-body control.
- Joint order is fixed as `[yaw, pitch]` in radians.

All motion Operations share the `head` resource with policy `queue`.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_joint` | `Empty` | `JointState` | 1000 ms |
| `get_pose` | `PoseQuery` | `Pose3d` | 1000 ms |
| `get_mode` | `Empty` | `Mode` | 1000 ms |
| `set_mode` | `Mode` | `Mode` | 1000 ms |
| `get_joint_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_joint_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `servo_pose` | `Pose3d` | `Pose3d` | 1000 ms |
| `get_arrival_thresholds` | `Empty` | `ArrivalThresholds` | 1000 ms |
| `set_arrival_thresholds` | `ArrivalThresholds` | `ArrivalThresholdsApplied` | 1000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `move_joint` | `JointMove` | Operation | head | — |
| `move_joint_path` | `JointPath` | Operation | head | — |
| `move_pose` | `PoseMove` | Operation | head | — |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `joint()` | `JointState` |
| `pose()` | `Pose3d` |

Enums used on this page:

**`HeadMode` enum**

| Value | Description |
|-------|-------------|
| `DISABLE` | Disable the head task under whole-body control |
| `FORWARD` | Lock the head forward |
| `TRACKING` | Track a 6D head pose goal |
| `GAZE` | Gaze tracking; the `Pose3d` position is the gaze point |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_joint

Read the head joint sample (`[yaw, pitch]`).

```python
get_joint(*, timeout_ms: int = 1000) -> JointState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `JointState`

| Field | Type | Description |
|------|------|------|
| `positions` | `list[float]` | Position list; point clouds store X/Y/Z interleaved |
| `velocities` | `list[float]` | Joint velocity array |
| `efforts` | `list[float]` | Joint effort array |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_pose

Read the head pose.

```python
get_pose(*, frame_id: str = "", end_frame: str = "", timeout_ms: int = 1000) -> Pose3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Pose3d`

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `z` | `float` | Z coordinate or component in meters |
| `qx` | `float` | Quaternion x |
| `qy` | `float` | Quaternion y |
| `qz` | `float` | Quaternion z |
| `qw` | `float` | Quaternion w |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

### get_mode

Read the current mode.

```python
get_mode(*, timeout_ms: int = 1000) -> HeadMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `HeadMode`

The proxy unwraps `Mode` into `HeadMode`.

**`HeadMode` enum**

| Value | Description |
|-------|-------------|
| `DISABLE` | Disable the head task under whole-body control |
| `FORWARD` | Lock the head forward |
| `TRACKING` | Track a 6D head pose goal |
| `GAZE` | Gaze tracking; the `Pose3d` position is the gaze point |

### set_mode

Switch the head constraint mode; under `GAZE` the pose position is the gaze point.

```python
set_mode(mode: HeadMode, *, timeout_ms: int = 1000) -> HeadMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `HeadMode` | (required) | Mode value |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `HeadMode`

The proxy unwraps `Mode` into `HeadMode`.

### get_joint_velocity_limit

Read the joint velocity limit.

```python
get_joint_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_joint_velocity_limit

Set the joint velocity limit and return the applied value.

```python
set_joint_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Joint velocity limit |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_joint_acceleration_limit

Read the joint acceleration limit.

```python
get_joint_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_joint_acceleration_limit

Set the joint acceleration limit and return the applied value.

```python
set_joint_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Joint acceleration limit |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_pose

Send one pose servo target and get the applied pose. This is a short command rather than a trajectory, suited to high-rate outer loops.

```python
servo_pose(target: Pose3d | None = None, *, x: float = 0.0, y: float = 0.0, z: float = 0.0, qx: float = 0.0, qy: float = 0.0, qz: float = 0.0, qw: float = 1.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Pose3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `Pose3d | None` | `None` | Goal value |
| `x` | `float` | `0.0` | X component in meters |
| `y` | `float` | `0.0` | Y component in meters |
| `z` | `float` | `0.0` | Z component in meters |
| `qx` | `float` | `0.0` | Quaternion x |
| `qy` | `float` | `0.0` | Quaternion y |
| `qz` | `float` | `0.0` | Quaternion z |
| `qw` | `float` | `1.0` | Quaternion w |
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `stamp_ns` | `int` | `0` | Goal time in ns; 0 means latest |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Pose3d`

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `z` | `float` | Z coordinate or component in meters |
| `qx` | `float` | Quaternion x |
| `qy` | `float` | Quaternion y |
| `qz` | `float` | Quaternion z |
| `qw` | `float` | Quaternion w |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

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
| `max_timeout_s` | `float` | Extra arrival budget in seconds added to the motion duration |

### set_arrival_thresholds

Replace the arrival thresholds for this slot. The change is in-memory only and applies to later motions.

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | Joint arrival tolerance in radians |
| `max_timeout_s` | `float` | `5.0` | Extra arrival budget in seconds |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArrivalThresholdsApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `applied` | `ArrivalThresholds` | Applied configuration |

### move_joint

Joint-space motion. `tolerance` is the arrival tolerance, `duration` the requested time, `wait_timeout` the extra arrival wait; 0 uses the defaults.

```python
move_joint(target: JointPositions, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `JointPositions` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
from fabot.types import JointPositions

robot.head.move_joint(JointPositions(positions=[0.3, -0.2]), duration=1.5).wait(timeout=10.0)
```

### move_joint_path

Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints.

```python
move_joint_path(waypoints: list[JointPositions], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[JointPositions]` | (required) | Waypoints, at least two |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointPathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose

Absolute end-effector motion. The reference frame comes from `target.frame_id` (empty uses the slot base); `end_frame` empty uses the active TCP or flange.

```python
move_pose(target: Pose3d, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `Pose3d` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### joint()

Head joint-state stream.

```python
joint(qos_profile: str = "latest") -> Channel
```

Frame payload is `JointState`:

| Field | Type | Description |
|------|------|------|
| `positions` | `list[float]` | Position list; point clouds store X/Y/Z interleaved |
| `velocities` | `list[float]` | Joint velocity array |
| `efforts` | `list[float]` | Joint effort array |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### pose()

Head pose stream.

```python
pose(qos_profile: str = "latest") -> Channel
```

Frame payload is `Pose3d`:

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `z` | `float` | Z coordinate or component in meters |
| `qx` | `float` | Quaternion x |
| `qy` | `float` | Quaternion y |
| `qz` | `float` | Quaternion z |
| `qw` | `float` | Quaternion w |
| `frame_id` | `str` | Reference frame of this pose. Empty on a command means the slot default base. Feedback preserves the source frame verbatim. |
| `stamp_ns` | `int` | Sample or goal time on robot_monotonic / PTP, nanoseconds. 0 means latest. |

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

`move_joint` / `move_joint_path` / `move_pose` share the `head` resource with policy `queue`.
