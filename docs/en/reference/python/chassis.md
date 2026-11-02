---
title: Chassis
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Chassis

## Module Overview

- Capability id: `chassis`; slots: `robot.chassis`
- Domain: `motion`; capability version: `1.1.0`
- Planar chassis motion: velocity servo, map-frame absolute / relative navigation, station navigation, plus parking, lock and pause control.
- `ChassisMode.MANUAL` allows `servo_twist` and body-relative moves; `AUTONOMOUS` allows map navigation. `NavigationMode` only selects the planning style.

All navigation Operations share the `chassis` resource with policy `queue` and a 180-second default budget.
The `ChassisStage` from `get_stage()` / `stage()` is a read-only projection of tasks and faults; there is no setter.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_pose` | `Empty` | `Pose2d` | 3000 ms |
| `set_pose` | `Pose2d` | `Pose2d` | 5000 ms |
| `get_twist` | `Empty` | `Twist2d` | 3000 ms |
| `get_stage` | `Empty` | `Stage` | 3000 ms |
| `get_station` | `Empty` | `Stations` | 5000 ms |
| `get_mode` | `Empty` | `Mode` | 3000 ms |
| `set_mode` | `Mode` | `Mode` | 3000 ms |
| `get_parking` | `Empty` | `Parking` | 3000 ms |
| `set_parking` | `Parking` | `Parking` | 3000 ms |
| `get_lock` | `Empty` | `Lock` | 3000 ms |
| `set_lock` | `Lock` | `Lock` | 3000 ms |
| `get_pause` | `Empty` | `Pause` | 3000 ms |
| `set_pause` | `Pause` | `Pause` | 3000 ms |
| `get_linear_velocity_limit` | `Empty` | `Float64` | 3000 ms |
| `set_linear_velocity_limit` | `Float64` | `Float64` | 3000 ms |
| `get_angular_velocity_limit` | `Empty` | `Float64` | 3000 ms |
| `set_angular_velocity_limit` | `Float64` | `Float64` | 3000 ms |
| `get_linear_acceleration_limit` | `Empty` | `Float64` | 3000 ms |
| `set_linear_acceleration_limit` | `Float64` | `Float64` | 3000 ms |
| `get_angular_acceleration_limit` | `Empty` | `Float64` | 3000 ms |
| `set_angular_acceleration_limit` | `Float64` | `Float64` | 3000 ms |
| `servo_twist` | `Twist2d` | `Twist2d` | 2000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `move_pose` | `PoseMove` | Operation | chassis | 180000 ms |
| `move_pose_relative` | `RelativePoseMove` | Operation | chassis | 180000 ms |
| `move_station` | `StationMove` | Operation | chassis | 180000 ms |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `pose()` | `Pose2d` |
| `twist()` | `Twist2d` |
| `stage()` | `Stage` |

Enums used on this page:

**`ChassisMode` enum**

| Value | Description |
|-------|-------------|
| `MANUAL` | Manual: allows `servo_twist` and body-relative moves |
| `AUTONOMOUS` | Autonomous: allows map navigation |

**`NavigationMode` enum**

| Value | Description |
|-------|-------------|
| `AUTONOMOUS` | Autonomous planning |
| `LINE_FOLLOW` | Line following |
| `POINT_TO_POINT` | Point to point |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_pose

Read the map-frame pose.

```python
get_pose(*, timeout_ms: int = 3000) -> Pose2d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `Pose2d`

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `theta` | `float` | Heading angle in radians |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### set_pose

Reset the map-frame pose to the given value and return the applied pose.

```python
set_pose(*, x: float, y: float, theta: float = 0.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 5000) -> Pose2d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `x` | `float` | (required) | X component in meters |
| `y` | `float` | (required) | Y component in meters |
| `theta` | `float` | `0.0` | Heading in radians |
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `stamp_ns` | `int` | `0` | Goal time in ns; 0 means latest |
| `timeout_ms` | `int` | `5000` | Timeout in milliseconds |

**Returns** `Pose2d`

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `theta` | `float` | Heading angle in radians |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_twist

Read the current velocity.

```python
get_twist(*, timeout_ms: int = 3000) -> Twist2d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `Twist2d`

| Field | Type | Description |
|------|------|------|
| `vx` | `float` | Body-frame X velocity in m/s |
| `vy` | `float` | Body-frame Y velocity in m/s |
| `vtheta` | `float` | Angular velocity in rad/s |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### get_stage

Read the current motion stage.

```python
get_stage(*, timeout_ms: int = 3000) -> ChassisStage
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `ChassisStage`

The proxy unwraps `Stage` into `ChassisStage`.

**`ChassisStage` enum**

| Value | Description |
|-------|-------------|
| `IDLE` | Idle |
| `MOVING` | Moving |
| `PAUSED` | Paused |
| `FAULTED` | Faulted |

### get_station

Read the map station list; `get_stations` is an alias.

```python
get_station(*, timeout_ms: int = 5000) -> list[StationInfo]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `5000` | Timeout in milliseconds |

**Returns** `list[StationInfo]`

The proxy unwraps `Stations` into `list[StationInfo]`.

**Element fields** `StationInfo`

| Field | Type | Description |
|------|------|------|
| `id` | `int` | Station id |
| `name` | `str` | Station name |
| `pose` | `Pose2d` | Station pose; absent when the backend does not provide one |

```python
for station in robot.chassis.get_station():
    print(station.id, station.name)
```

### get_mode

Read the current mode.

```python
get_mode(*, timeout_ms: int = 3000) -> ChassisMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `ChassisMode`

The proxy unwraps `Mode` into `ChassisMode`.

**`ChassisMode` enum**

| Value | Description |
|-------|-------------|
| `MANUAL` | Manual: allows `servo_twist` and body-relative moves |
| `AUTONOMOUS` | Autonomous: allows map navigation |

### set_mode

Switch between manual and autonomous modes.

```python
set_mode(mode: ChassisMode, *, timeout_ms: int = 3000) -> ChassisMode
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `mode` | `ChassisMode` | (required) | Mode value |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `ChassisMode`

The proxy unwraps `Mode` into `ChassisMode`.

**`ChassisMode` enum**

| Value | Description |
|-------|-------------|
| `MANUAL` | Manual: allows `servo_twist` and body-relative moves |
| `AUTONOMOUS` | Autonomous: allows map navigation |

### get_parking

Query whether parking is latched.

```python
get_parking(*, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Parking` into `bool`.

### set_parking

Set the parking latch.

```python
set_parking(*, parked: bool, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `parked` | `bool` | (required) | `True` latches parking |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Parking` into `bool`.

### get_lock

Query whether the chassis degree of freedom is locked.

```python
get_lock(*, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Lock` into `bool`.

### set_lock

Lock or unlock the chassis degree of freedom.

```python
set_lock(*, locked: bool, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `locked` | `bool` | (required) | `True` locks the degree of freedom |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Lock` into `bool`.

### get_pause

Query whether in-flight navigation is paused.

```python
get_pause(*, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Pause` into `bool`.

### set_pause

Pause or resume in-flight navigation without dropping `move_*` handles.

```python
set_pause(*, paused: bool, timeout_ms: int = 3000) -> bool
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `paused` | `bool` | (required) | `True` pauses in-flight navigation |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `bool`

The proxy unwraps `Pause` into `bool`.

### get_linear_velocity_limit

Read the linear velocity limit.

```python
get_linear_velocity_limit(*, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_velocity_limit

Set the linear velocity limit and return the applied value.

```python
set_linear_velocity_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear velocity limit in m/s |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_velocity_limit

Read the angular velocity limit.

```python
get_angular_velocity_limit(*, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_velocity_limit

Set the angular velocity limit and return the applied value.

```python
set_angular_velocity_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular velocity limit in rad/s |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_linear_acceleration_limit

Read the linear acceleration limit.

```python
get_linear_acceleration_limit(*, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_linear_acceleration_limit

Set the linear acceleration limit and return the applied value.

```python
set_linear_acceleration_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Linear acceleration limit in m/s² |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_angular_acceleration_limit

Read the angular acceleration limit.

```python
get_angular_acceleration_limit(*, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_angular_acceleration_limit

Set the angular acceleration limit and return the applied value.

```python
set_angular_acceleration_limit(value: float, *, timeout_ms: int = 3000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Angular acceleration limit in rad/s² |
| `timeout_ms` | `int` | `3000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_twist

Velocity servo returning the applied velocity; only allowed in `MANUAL` mode.

```python
servo_twist(*, vx: float, vy: float, vtheta: float = 0.0, frame_id: str = "", stamp_ns: int = 0, timeout_ms: int = 2000) -> Twist2d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `vx` | `float` | (required) | Body-frame X velocity in m/s |
| `vy` | `float` | (required) | Body-frame Y velocity in m/s |
| `vtheta` | `float` | `0.0` | Angular velocity in rad/s |
| `frame_id` | `str` | `""` | Reference frame; empty means the slot default base |
| `stamp_ns` | `int` | `0` | Goal time in ns; 0 means latest |
| `timeout_ms` | `int` | `2000` | Timeout in milliseconds |

**Returns** `Twist2d`

| Field | Type | Description |
|------|------|------|
| `vx` | `float` | Body-frame X velocity in m/s |
| `vy` | `float` | Body-frame Y velocity in m/s |
| `vtheta` | `float` | Angular velocity in rad/s |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

```python
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)
```

### move_pose

Navigate to an absolute map-frame pose.

```python
move_pose(target: Pose2d, *, mode: NavigationMode = NavigationMode.AUTONOMOUS, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0) -> MovePoseOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `Pose2d` | (required) | Goal value |
| `mode` | `NavigationMode` | `NavigationMode.AUTONOMOUS` | Mode value |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MovePoseOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_pose_relative

Body-frame relative navigation; `target.x` / `y` / `theta` are `dx` / `dy` / `dyaw`.

```python
move_pose_relative(target: Pose2d, *, position_tolerance: float = 0.0, orientation_tolerance: float = 0.0, duration: float = 0.0) -> MovePoseRelativeOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `Pose2d` | (required) | Goal value |
| `position_tolerance` | `float` | `0.0` | Position tolerance in meters; 0 uses the slot default |
| `orientation_tolerance` | `float` | `0.0` | Orientation tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MovePoseRelativeOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_station

Navigate to a map station; `station_id` comes from `get_station()`.

```python
move_station(station_id: int, *, mode: NavigationMode = NavigationMode.AUTONOMOUS, duration: float = 0.0) -> MoveStationOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `station_id` | `int` | (required) | Station id |
| `mode` | `NavigationMode` | `NavigationMode.AUTONOMOUS` | Mode value |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveStationOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.get_station()
op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
snap = op.get(timeout=5.0)
print(snap.state)
```

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### pose()

Map-frame pose stream.

```python
pose(qos_profile: str = "latest") -> Channel
```

Frame payload is `Pose2d`:

| Field | Type | Description |
|------|------|------|
| `x` | `float` | X coordinate or component in meters |
| `y` | `float` | Y coordinate or component in meters |
| `theta` | `float` | Heading angle in radians |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### twist()

Velocity stream.

```python
twist(qos_profile: str = "latest") -> Channel
```

Frame payload is `Twist2d`:

| Field | Type | Description |
|------|------|------|
| `vx` | `float` | Body-frame X velocity in m/s |
| `vy` | `float` | Body-frame Y velocity in m/s |
| `vtheta` | `float` | Angular velocity in rad/s |
| `frame_id` | `str` | Reference frame; an empty string in a command means the slot default base, feedback keeps the source frame |
| `stamp_ns` | `int` | Timestamp on the robot clock in ns; 0 means latest |

### stage()

Motion-stage stream.

```python
stage(qos_profile: str = "latest") -> Channel
```

Frame payload is `Stage`:

| Field | Type | Description |
|------|------|------|
| `stage` | `ChassisStage` | Motion stage (`ChassisStage`) |

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

`move_pose` / `move_pose_relative` / `move_station` share the `chassis` resource with policy `queue` and a 180-second default budget.
