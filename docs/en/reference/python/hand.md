---
title: Hand
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Hand

## Module Overview

- Capability id: `hand`; slots: `robot.left_hand` / `robot.right_hand`
- Domain: `motion`; capability version: `1.1.0`
- Dexterous hand: per-joint opening, velocity / force limits, five-finger tactile arrays and long-running joint / opening motion.
- Both opening and joint angles are arrays ordered like the hand controller `joints`; `move_opening` interpolates between the open and closed configuration per joint.

All motion Operations share the `hand` resource with policy `queue`.

## API Overview

| Name | Kind | Description |
|------|------|------|
| `get_opening` | Command | Read the per-joint opening; default timeout 1000 ms. |
| `get_joint` | Command | Read the current joint sample: positions, velocities, efforts and timestamp; default timeout 1000 ms. |
| `get_tactile` | Command | Read the five-finger tactile arrays and total contact force; default timeout 1000 ms. |
| `get_velocity_limit` | Command | Read the velocity limit; default timeout 1000 ms. |
| `set_velocity_limit` | Command | Set the velocity limit and return the applied value; default timeout 8000 ms. |
| `get_force_limit` | Command | Read the force limit; default timeout 1000 ms. |
| `set_force_limit` | Command | Set the force limit and return the applied value; default timeout 8000 ms. |
| `servo_opening` | Command | Send one opening servo target and return the applied value; default timeout 1000 ms. |
| `servo_joint` | Command | Send one joint servo target; default timeout 1000 ms. |
| `get_arrival_thresholds` | Command | Read the arrival thresholds for this slot; default timeout 1000 ms. |
| `set_arrival_thresholds` | Command | Replace the arrival thresholds for this slot; default timeout 1000 ms. |
| `move_opening` | Operation | Opening motion. |
| `move_joint` | Operation | Joint motion in radians. |
| `move_joint_path` | Operation | Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints. |
| `opening` | Channel | Opening stream; frame is `Doubles`. |
| `joint` | Channel | Joint position stream; frame is `JointState`. |
| `tactile` | Channel | Tactile array stream; frame is `HandTactile`. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_opening

Read the per-joint opening.

```python
get_opening(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### get_joint

Read the current joint sample: positions, velocities, efforts and timestamp.

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

### get_tactile

Read the five-finger tactile arrays and total contact force.

```python
get_tactile(*, timeout_ms: int = 1000) -> HandTactile
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `HandTactile`

| Field | Type | Description |
|------|------|------|
| `thumb` | `FingerTactile` | Thumb tactile array |
| `index` | `FingerTactile` | Index tactile array |
| `middle` | `FingerTactile` | Middle tactile array |
| `ring` | `FingerTactile` | Ring tactile array |
| `pinky` | `FingerTactile` | Pinky tactile array |
| `timestamp_us` | `int` | Sample timestamp in microseconds |

```python
tactile = robot.right_hand.get_tactile()
print(tactile.thumb.total_force, tactile.index.total_force)
```

### get_velocity_limit

Read the velocity limit.

```python
get_velocity_limit(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### set_velocity_limit

Set the velocity limit and return the applied value.

```python
set_velocity_limit(values: list[float], *, timeout_ms: int = 8000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `values` | `list[float]` | (required) | Value list |
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### get_force_limit

Read the force limit.

```python
get_force_limit(*, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### set_force_limit

Set the force limit and return the applied value.

```python
set_force_limit(values: list[float], *, timeout_ms: int = 8000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `values` | `list[float]` | (required) | Value list |
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### servo_opening

Send one opening servo target and return the applied value.

```python
servo_opening(values: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `values` | `list[float]` | (required) | Value list |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `Doubles` into `list[float]`.

### servo_joint

Send one joint servo target.

```python
servo_joint(positions: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `positions` | `list[float]` | (required) |  |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `JointPositions` into `list[float]`.

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
set_arrival_thresholds(*, joint_tolerance: float = 0.02, max_timeout_s: float = 10.0, timeout_ms: int = 1000) -> ArrivalThresholdsApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `joint_tolerance` | `float` | `0.02` | Joint arrival tolerance in radians |
| `max_timeout_s` | `float` | `10.0` | Extra arrival budget in seconds |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `ArrivalThresholdsApplied`

| Field | Type | Description |
|------|------|------|
| `outcome` | `Outcome` | Call result |
| `applied` | `ArrivalThresholds` | Applied configuration |

### move_opening

Opening motion. `tolerance` is in opening units; a `duration` of 0 uses the slot `max_timeout_s`.

```python
move_opening(target: list[float], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveOpeningOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `list[float]` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveOpeningOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_joint

Joint motion in radians. `tolerance` is in radians; a `duration` of 0 uses the slot `max_timeout_s`.

```python
move_joint(target: list[float], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveJointOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `list[float]` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveJointOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

### move_joint_path

Follow a joint waypoint sequence; at least two waypoints, the first reached from the current joints.

```python
move_joint_path(waypoints: list[JointPositions], *, tolerance: float = 0.0, duration: float = 0.0) -> MoveJointPathOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `waypoints` | `list[JointPositions]` | (required) | Waypoints, at least two |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveJointPathOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### opening()

Opening stream.

```python
opening(qos_profile: str = "latest") -> Channel
```

Frame payload is `Doubles`:

| Field | Type | Description |
|------|------|------|
| `values` | `list[float]` | Value list |

### joint()

Joint position stream.

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

### tactile()

Tactile array stream.

```python
tactile(qos_profile: str = "latest") -> Channel
```

Frame payload is `HandTactile`:

| Field | Type | Description |
|------|------|------|
| `thumb` | `FingerTactile` | Thumb tactile array |
| `index` | `FingerTactile` | Index tactile array |
| `middle` | `FingerTactile` | Middle tactile array |
| `ring` | `FingerTactile` | Ring tactile array |
| `pinky` | `FingerTactile` | Pinky tactile array |
| `timestamp_us` | `int` | Sample timestamp in microseconds |

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

`move_opening` / `move_joint` / `move_joint_path` share the `hand` resource with policy `queue`.
