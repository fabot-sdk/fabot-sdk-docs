---
title: Arm
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Arm

## Module Overview

- Capability id: `arm`; slots: `robot.left_arm` / `robot.right_arm`
- Domain: `motion`; capability version: `1.1.0`
- Single-arm joint motion, end-effector motion, wrench reading and compliance control. Left and right arms share the API on independent slots.
- Commands take their reference frame from `Pose3d.frame_id` (empty defaults to `arm_base`); `end_frame` empty defaults to the active tool TCP, or the flange without a tool.

Every motion Operation on one arm shares the `arm` resource with policy `queue`: new tasks on the same arm queue instead of running concurrently.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_joint` | `Empty` | `JointState` | 1000 ms |
| `get_pose` | `PoseQuery` | `Pose3d` | 1000 ms |
| `get_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `get_filtered_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `get_joint_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_linear_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_linear_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_angular_velocity_limit` | `Empty` | `Float64` | 1000 ms |
| `set_angular_velocity_limit` | `Float64` | `Float64` | 1000 ms |
| `get_joint_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_joint_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_linear_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_linear_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_angular_acceleration_limit` | `Empty` | `Float64` | 1000 ms |
| `set_angular_acceleration_limit` | `Float64` | `Float64` | 1000 ms |
| `get_brake` | `Empty` | `BrakeState` | 10000 ms |
| `set_brake` | `BrakeState` | `BrakeState` | 10000 ms |
| `get_enable` | `Empty` | `Enable` | 1000 ms |
| `set_enable` | `Enable` | `Enable` | 3000 ms |
| `set_wrench_zero` | `WrenchZero` | `WrenchZero` | 1000 ms |
| `get_compliance_mask` | `Empty` | `Doubles` | 1000 ms |
| `set_compliance_mask` | `Doubles` | `Doubles` | 1000 ms |
| `get_compliance_wrench` | `Empty` | `Wrench3d` | 1000 ms |
| `set_compliance_wrench` | `Wrench3d` | `Wrench3d` | 1000 ms |
| `get_compliance_linear_limit` | `Empty` | `Float64` | 1000 ms |
| `set_compliance_linear_limit` | `Float64` | `Float64` | 1000 ms |
| `get_compliance_angular_limit` | `Empty` | `Float64` | 1000 ms |
| `set_compliance_angular_limit` | `Float64` | `Float64` | 1000 ms |
| `servo_pose` | `Pose3d` | `Pose3d` | 3000 ms |
| `servo_twist` | `Twist3d` | `Twist3d` | 1000 ms |
| `get_arrival_thresholds` | `Empty` | `ArrivalThresholds` | 1000 ms |
| `set_arrival_thresholds` | `ArrivalThresholds` | `ArrivalThresholdsApplied` | 1000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `move_joint` | `JointMove` | Operation | arm | — |
| `move_joint_path` | `JointPathMove` | Operation | arm | — |
| `move_pose` | `PoseMove` | Operation | arm | — |
| `move_pose_relative` | `PoseMove` | Operation | arm | — |
| `move_pose_path` | `PosePathMove` | Operation | arm | — |
| `move_pose_arc_by_points` | `PoseArcPointsMove` | Operation | arm | — |
| `move_pose_arc_by_center` | `PoseArcCenterMove` | Operation | arm | — |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `joint()` | `JointState` |
| `pose()` | `Pose3d` |
| `wrench()` | `Wrench3d` |
| `filtered_wrench()` | `Wrench3d` |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_joint

Read the current joint sample: positions in radians, velocities, efforts and timestamp.

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

```python
joints = robot.left_arm.get_joint()
print(joints.positions, joints.velocities)

pose = robot.left_arm.get_pose(frame_id="base_link")
print(pose.x, pose.y, pose.z, pose.frame_id)
```

### get_pose

Read the current end-effector pose.

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

### get_wrench

Read the raw end-effector wrench (unfiltered).

```python
get_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Wrench3d`

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_filtered_wrench

Read the filtered end-effector wrench.

```python
get_filtered_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Wrench3d`

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

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

### get_linear_velocity_limit

Read the linear velocity limit.

```python
get_linear_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_velocity_limit

Set the linear velocity limit and return the applied value.

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear velocity limit in m/s |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_velocity_limit

Read the angular velocity limit.

```python
get_angular_velocity_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_velocity_limit

Set the angular velocity limit and return the applied value.

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular velocity limit in rad/s |
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

### get_linear_acceleration_limit

Read the linear acceleration limit.

```python
get_linear_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_acceleration_limit

Set the linear acceleration limit and return the applied value.

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear acceleration limit in m/s² |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_acceleration_limit

Read the angular acceleration limit.

```python
get_angular_acceleration_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_acceleration_limit

Set the angular acceleration limit and return the applied value.

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular acceleration limit in rad/s² |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_brake

Query the brake state.

```python
get_brake(*, timeout_ms: int = 10000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `BrakeState` into `bool`.

### set_brake

Release or engage the brake.

```python
set_brake(open: bool, *, timeout_ms: int = 10000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `open` | `bool` | (required) | `True` releases the brake, `False` engages it |
| `timeout_ms` | `int` | `10000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `BrakeState` into `bool`.

### get_enable

Query the enable state.

```python
get_enable(*, timeout_ms: int = 1000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Enable` into `bool`.

### set_enable

Enable or disable the joints.

```python
set_enable(enabled: bool, *, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `enabled` | `bool` | (required) | Whether enabled |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Enable` into `bool`.

### set_wrench_zero

Trigger a wrench zero-offset calibration.

```python
set_wrench_zero(zero: bool = True, *, timeout_ms: int = 1000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `zero` | `bool` | `True` | Whether to zero the sensor |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `WrenchZero` into `bool`.

### get_compliance_mask

Read the per-DoF compliance weights.

```python
get_compliance_mask(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### set_compliance_mask

Set the per-DoF compliance weights and return the applied values.

```python
set_compliance_mask(values: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `values` | `list[float]` | (required) | Value list |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### get_compliance_wrench

Read the compliance target wrench.

```python
get_compliance_wrench(*, timeout_ms: int = 1000) -> Wrench3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Wrench3d`

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### set_compliance_wrench

Set the compliance target force and torque.

```python
set_compliance_wrench(*, force: Vector3d, torque: Vector3d, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Wrench3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `force` | `Vector3d` | (required) | Force vector in newtons |
| `torque` | `Vector3d` | (required) | Torque vector in N·m |
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `stamp_ns` | `int` | `0` | Goal time in ns; 0 means latest |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Wrench3d`

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_compliance_linear_limit

Read the compliance linear limit.

```python
get_compliance_linear_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_compliance_linear_limit

Set the compliance linear limit.

```python
set_compliance_linear_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Compliance linear limit in meters |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_compliance_angular_limit

Read the compliance angular limit.

```python
get_compliance_angular_limit(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_compliance_angular_limit

Set the compliance angular limit.

```python
set_compliance_angular_limit(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Compliance angular limit in radians |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_pose

Pose servo. Pass a full `Pose3d` or just the `x` / `y` / `z` / `qx` / `qy` / `qz` / `qw` components.

```python
servo_pose(target: Pose3d | None = None, *, x: float = 0.0, y: float = 0.0, z: float = 0.0, qx: float = 0.0, qy: float = 0.0, qz: float = 0.0, qw: float = 1.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 3000) -> Pose3d
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
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

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

### servo_twist

Send one velocity servo target and return the applied velocity.

```python
servo_twist(*, linear: Vector3d, angular: Vector3d, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 1000) -> Twist3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `linear` | `Vector3d` | (required) | Linear velocity in m/s |
| `angular` | `Vector3d` | (required) | Angular rate in rad/s |
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `stamp_ns` | `int` | `0` | Goal time in ns; 0 means latest |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Twist3d`

| Field | Type | Description |
|------|------|------|
| `linear` | `Vector3d` | Linear velocity in m/s |
| `angular` | `Vector3d` | Angular velocity in rad/s |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

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

Replace the arrival thresholds and return the `outcome` plus the applied values. Arrival requires two consecutive samples inside the threshold.

```python
set_arrival_thresholds(*, joint_tolerance: float = 0.02, pose_position_tolerance: float = 0.02, pose_orientation_tolerance: float = 0.05, max_timeout_s: float = 5.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | Joint arrival tolerance in radians |
| `pose_position_tolerance` | `float` | `0.02` | Pose position tolerance in meters |
| `pose_orientation_tolerance` | `float` | `0.05` | Pose orientation error as `1 - |dot(q, q_target)|` |
| `max_timeout_s` | `float` | `5.0` | Extra arrival budget in seconds |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArrivalThresholdsApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `applied` | `ArrivalThresholds` | Applied configuration |

### move_joint

Joint-space motion. `tolerance` is the arrival tolerance in radians, `duration` the requested time and `wait_timeout` the extra arrival wait; 0 uses the defaults. A plain `list[float]` is accepted and wrapped into `JointPositions`.

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

positions = list(robot.left_arm.get_joint().positions)
positions[1] += 0.2
op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)
result = op.wait(timeout=10.0)          # 等终态，失败时抛错
print(result.success, result.status_message)
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

```python
from fabot.types import Pose3d

op = robot.right_arm.move_pose(
    Pose3d(x=0.3, y=0.0, z=0.4, qw=1.0, frame_id="arm_base"),
    position_tolerance=0.01,
)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### move_pose_relative

Relative end-effector motion; `target` is an increment from the current pose.

```python
move_pose_relative(target: Pose3d, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseRelativeOperation
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

Returns a `MovePoseRelativeOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_path

Follow an end-effector waypoint sequence; each waypoint carries its own `frame_id`.

```python
move_pose_path(waypoints: list[Pose3d], *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePosePathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[Pose3d]` | (required) | Waypoints, at least two |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePosePathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_arc_by_points

Arc through three points: from the current pose through `via` to `end`.

```python
move_pose_arc_by_points(target: PoseArcByPoints, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByPointsOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `PoseArcByPoints` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseArcByPointsOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_arc_by_center

Center arc motion; the center is located in `center.frame_id`.

```python
move_pose_arc_by_center(target: PoseArcByCenter, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseArcByCenterOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `PoseArcByCenter` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseArcByCenterOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### joint()

Joint-state stream.

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

End-effector pose stream.

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

### wrench()

Raw wrench stream.

```python
wrench(qos_profile: str = "latest") -> Channel
```

Frame payload is `Wrench3d`:

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### filtered_wrench()

Filtered wrench stream.

```python
filtered_wrench(qos_profile: str = "latest") -> Channel
```

Frame payload is `Wrench3d`:

| Field | Type | Description |
|------|------|------|
| `force` | `Vector3d` | Force vector in newtons |
| `torque` | `Vector3d` | Torque vector in N·m |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

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

`move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center` share the `arm` resource with policy `queue`, so new tasks on one arm queue up. Everything else is a short command.
