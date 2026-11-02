---
title: Gripper
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Gripper

## Module Overview

- Capability id: `gripper`; slots: `robot.left_gripper` / `robot.right_gripper`
- Domain: `motion`; capability version: `1.1.0`
- Single-DoF two-finger adaptive gripper: normalized opening, velocity and force limits, servo and long-running opening motion.
- Opening ranges from 0 (closed) to 1 (open); `0` is a legal target, not a default.

`opening` and `joint[0]` map to the same actuator on the current adapter, and both read back from the same joint position.

## API Overview

| Method | Request | Response | Default timeout |
|------|------|------|------|
| `get_opening` | `Empty` | `Float64` | 1000 ms |
| `get_joint` | `Empty` | `JointState` | 1000 ms |
| `get_velocity_limit` | `Empty` | `Float64` | 8000 ms |
| `set_velocity_limit` | `Float64` | `Float64` | 8000 ms |
| `get_force_limit` | `Empty` | `Float64` | 8000 ms |
| `set_force_limit` | `Float64` | `Float64` | 8000 ms |
| `servo_opening` | `Float64` | `Float64` | 1000 ms |
| `servo_joint` | `Doubles` | `JointPositions` | 1000 ms |

All calls above are Commands (synchronous request/response); `timeout_ms` can be overridden per call.

| Method | Request | Kind | Resources | Default budget |
|------|------|------|------|------|
| `move_opening` | `OpeningMove` | Operation | gripper | — |
| `move_joint` | `JointMove` | Operation | gripper | — |

Operations return a handle immediately; progress and results come from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

| Channel | Content |
|------|------|
| `opening()` | `Float64` |
| `joint()` | `JointState` |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only. Fields use snake_case (`frame_id`); the generated types also accept the camelCase alias.

### get_opening

Read the current opening.

```python
get_opening(*, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

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

### get_velocity_limit

Read the velocity limit.

```python
get_velocity_limit(*, timeout_ms: int = 8000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_velocity_limit

Set the velocity limit and return the applied value.

```python
set_velocity_limit(value: float, *, timeout_ms: int = 8000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Velocity limit |
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### get_force_limit

Read the force limit.

```python
get_force_limit(*, timeout_ms: int = 8000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### set_force_limit

Set the force limit and return the applied value.

```python
set_force_limit(value: float, *, timeout_ms: int = 8000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Force limit |
| `timeout_ms` | `int` | `8000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_opening

Send one opening servo target and return the applied value.

```python
servo_opening(value: float, *, timeout_ms: int = 1000) -> float
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `value` | `float` | (required) | Goal opening |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `float`

The proxy unwraps `Float64` into `float`.

### servo_joint

Joint servo returning the applied values.

```python
servo_joint(values: list[float], *, timeout_ms: int = 1000) -> list[float]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `values` | `list[float]` | (required) | Value list |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `list[float]`

The proxy unwraps `JointPositions` into `list[float]`.

### move_opening

Normalized opening motion. `tolerance` / `duration` of 0 use the adapter defaults; `duration` is a wait budget, not a trajectory duration.

```python
move_opening(target: float, *, tolerance: float = 0.0, duration: float = 0.0) -> MoveOpeningOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `float` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveOpeningOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

```python
op = robot.left_gripper.move_opening(0.0, duration=1.0)   # 全闭
op.wait(timeout=5.0)
print(robot.left_gripper.get_opening())
```

### move_joint

Physical-stroke motion. `target.values` must have length 1; with a percentage-only actuator it equals the opening and is clamped to [0, 1].

```python
move_joint(target: Doubles, *, tolerance: float = 0.0, duration: float = 0.0) -> MoveJointOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `target` | `Doubles` | (required) | Goal value |
| `tolerance` | `float` | `0.0` | Arrival tolerance; 0 uses the slot default |
| `duration` | `float` | `0.0` | Requested motion duration in seconds; 0 uses the controller default |

Returns a `MoveJointOperation` handle with `id` / `get()` / `wait()` / `cancel()` / `events()`; it is also iterable and a context manager.

## Channels

Opening a channel takes a lease and returns a handle: iterate with `frames()`, take one sample with `next()`, renew with `renew()`, release with `close()`. See [Events & Data Channels](../../usage/events-channels.md).

### opening()

Opening stream.

```python
opening(qos_profile: str = "latest") -> Channel
```

Frame payload is `Float64`:

| Field | Type | Description |
|------|------|------|
| `value` | `float` | Value |

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

`move_opening` / `move_joint` share the `gripper` resource with policy `queue`.
