---
title: Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Motion

## Module Overview

- Capability id: `motion`; slots: `robot.motion`
- Domain: `motion`; capability version: `1.1.0`
- Whole-body motion control: motion regime, whole-body joint / pose goals, homing and presets, plus the whole-body control state and center-of-mass margin.
- `MotionMode` is the control regime (`HOLD` / `OCS2` / `MOVEJ`), not the same thing as the run state from `robot.state()`.

All motion Operations share the `motion_controller` resource with policy `queue` and a 60-second default budget.
`set_mode(COMPLIANCE)` is rejected: the current stack has no reachable compliance state.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_joint` | `Empty` | `WholeBodyJointState` | 1000 ms |
| `get_wbc_state` | `Empty` | `WbcState` | 1000 ms |
| `get_center_of_mass` | `Empty` | `CenterOfMass` | 1000 ms |
| `get_mode` | `Empty` | `Mode` | 1000 ms |
| `set_mode` | `Mode` | `Mode` | 7000 ms |
| `servo_pose` | `WholeBodyPoseTarget` | `WholeBodyPoseTarget` | 1000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `move_home` | `Home` | Operation | motion_controller | 60000 ms |
| `move_preset` | `Preset` | Operation | motion_controller | 60000 ms |
| `move_joint` | `JointMove` | Operation | motion_controller | 60000 ms |
| `move_joint_path` | `JointPath` | Operation | motion_controller | 60000 ms |
| `move_pose` | `PoseMove` | Operation | motion_controller | 60000 ms |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `joint()` | `WholeBodyJointState` |
| `wbc_state()` | `WbcState` |
| `center_of_mass()` | `CenterOfMass` |

Enums used on this page:

**`MotionMode` enum**

| Value | Description |
|-------|-------------|
| `HOLD` | Hold the current configuration |
| `OCS2` | OCS2 whole-body control |
| `MOVEJ` | MoveJ joint servo mode |
| `COMPLIANCE` | Compliance mode; not implemented by the current stack and rejected by `set_mode` |

**`HomePose` enum**

| Value | Description |
|-------|-------------|
| `PRIMARY` | Primary home |
| `SECONDARY` | Secondary home |
| `TERTIARY` | Tertiary home |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_joint

Read the whole-body joint sample (body / left arm / right arm / head).

```python
get_joint(*, timeout_ms: int = 1000) -> WholeBodyJointState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `WholeBodyJointState`

| Field | Type | Description |
|------|------|------|
| `body` | `JointState` | Body data |
| `left_arm` | `JointState` | Left-arm data |
| `right_arm` | `JointState` | Right-arm data |
| `head` | `JointState` | Head data |

### get_wbc_state

Read the whole-body control state: per-part modes, arm enables and chassis lock.

```python
get_wbc_state(*, timeout_ms: int = 1000) -> WbcState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `WbcState`

| Field | Type | Description |
|------|------|------|
| `body_mode` | `BodyMode` | Body constraint mode (`BodyMode`) |
| `head_mode` | `HeadMode` | Head constraint mode (`HeadMode`) |
| `arms_mode` | `ArmsMode` | Arm coupling mode (`ArmsMode`) |
| `left_arm_enabled` | `bool` | Whether the left arm is enabled |
| `right_arm_enabled` | `bool` | Whether the right arm is enabled |
| `chassis_locked` | `bool` | Whether the chassis is locked |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_center_of_mass

Read the center of mass and its margin to the support polygon.

```python
get_center_of_mass(*, timeout_ms: int = 1000) -> CenterOfMass
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `CenterOfMass`

| Field | Type | Description |
|------|------|------|
| `position` | `Vector3d` | Position vector |
| `status` | `SupportStatus` | Status snapshot |
| `min_safe_margin` | `float` | Minimum margin to the support polygon in meters |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_mode

Read the current mode.

```python
get_mode(*, timeout_ms: int = 1000) -> MotionMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `MotionMode`

The proxy unwraps `Mode` into `MotionMode`.

**`MotionMode` enum**

| Value | Description |
|-------|-------------|
| `HOLD` | Hold the current configuration |
| `OCS2` | OCS2 whole-body control |
| `MOVEJ` | MoveJ joint servo mode |
| `COMPLIANCE` | Compliance mode; not implemented by the current stack and rejected by `set_mode` |

### set_mode

Switch the motion regime and return the applied one.

```python
set_mode(mode: MotionMode, *, timeout_ms: int = 7000) -> MotionMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `MotionMode` | (required) | Mode value |
| `timeout_ms` | `int` | `7000` | Timeout in milliseconds |

**Returns** `MotionMode`

The proxy unwraps `Mode` into `MotionMode`.

```python
from fabot.capabilities.motion import MotionMode

applied = robot.motion.set_mode(MotionMode.OCS2)
print(applied)
print(robot.motion.get_wbc_state().body_mode)
```

### servo_pose

Whole-body pose servo: supply goals for all three parts and get the applied values.

```python
servo_pose(*, left_arm: Pose3d, right_arm: Pose3d, body: Pose3d, timeout_ms: int = 1000) -> WholeBodyPoseTarget
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `left_arm` | `Pose3d` | (required) | Left-arm goal pose |
| `right_arm` | `Pose3d` | (required) | Right-arm goal pose |
| `body` | `Pose3d` | (required) | Body goal pose |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `WholeBodyPoseTarget`

| Field | Type | Description |
|------|------|------|
| `left_arm` | `Pose3d` | Left-arm data |
| `right_arm` | `Pose3d` | Right-arm data |
| `body` | `Pose3d` | Body data |

### move_home

Move to a preset home pose; `HomePose.PRIMARY` is the default.

```python
move_home(target: HomePose = HomePose.PRIMARY, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHomeOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `HomePose` | `HomePose.PRIMARY` | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveHomeOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
from fabot.capabilities.motion import HomePose

robot.motion.move_home(HomePose.PRIMARY, duration=5.0).wait(timeout=30.0)
```

### move_preset

Move to a named preset configuration.

```python
move_preset(target: str, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePresetOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `str` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePresetOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_joint

Joint-space motion. `tolerance` is the arrival tolerance, `duration` the requested time, `wait_timeout` the extra arrival wait; 0 uses the defaults.

```python
move_joint(target: WholeBodyJointTarget, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `WholeBodyJointTarget` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_joint_path

Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints.

```python
move_joint_path(waypoints: list[WholeBodyJointTarget], *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveJointPathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[WholeBodyJointTarget]` | (required) | Waypoints, at least two |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MoveJointPathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose

Absolute end-effector motion. The reference frame comes from `target.frame_id` (empty uses the slot base); `end_frame` empty uses the active TCP or flange.

```python
move_pose(target: WholeBodyPoseTarget, *, end_frame: str = "", position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MovePoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `WholeBodyPoseTarget` | (required) | Goal value |
| `end_frame` | `str` | `""` | Controlled end frame; empty means the active tool TCP, or the flange without a tool |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival wait in seconds; 0 keeps the default wait policy |

Returns a `MovePoseOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### joint()

Whole-body joint-state stream.

```python
joint(qos_profile: str = "latest") -> Channel
```

Frame payload is `WholeBodyJointState`:

| Field | Type | Description |
|------|------|------|
| `body` | `JointState` | Body data |
| `left_arm` | `JointState` | Left-arm data |
| `right_arm` | `JointState` | Right-arm data |
| `head` | `JointState` | Head data |

### wbc_state()

Whole-body control state stream.

```python
wbc_state(qos_profile: str = "latest") -> Channel
```

Frame payload is `WbcState`:

| Field | Type | Description |
|------|------|------|
| `body_mode` | `BodyMode` | Body constraint mode (`BodyMode`) |
| `head_mode` | `HeadMode` | Head constraint mode (`HeadMode`) |
| `arms_mode` | `ArmsMode` | Arm coupling mode (`ArmsMode`) |
| `left_arm_enabled` | `bool` | Whether the left arm is enabled |
| `right_arm_enabled` | `bool` | Whether the right arm is enabled |
| `chassis_locked` | `bool` | Whether the chassis is locked |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### center_of_mass()

Center-of-mass and margin stream.

```python
center_of_mass(qos_profile: str = "latest") -> Channel
```

Frame payload is `CenterOfMass`:

| Field | Type | Description |
|------|------|------|
| `position` | `Vector3d` | Position vector |
| `status` | `SupportStatus` | Status snapshot |
| `min_safe_margin` | `float` | Minimum margin to the support polygon in meters |
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

`move_home` / `move_preset` / `move_joint` / `move_joint_path` / `move_pose` share the `motion_controller` resource with policy `queue` and a 60-second default budget.
