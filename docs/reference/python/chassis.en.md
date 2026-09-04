---
title: Chassis
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Chassis

## Module Overview

- Capability id: `chassis`; slot: `robot.chassis`
- Chassis motion control: velocity commands, speed / acceleration limits, station navigation, relative moves, relocalization.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `stop` | — | `OutcomeT` | Command |
| `set_max_speed` | `linear`, `angular` | `MaxSpeedAppliedT` | Command |
| `get_max_speed` | — | `MaxSpeedT` | Command |
| `set_max_acceleration` | `linear`, `angular` | `MaxAccelerationAppliedT` | Command |
| `get_max_acceleration` | — | `MaxAccelerationT` | Command |
| `set_velocity` | `vx`, `vy`, `vtheta` | `OutcomeT` | Command |
| `pause` | — | `OutcomeT` | Command |
| `resume` | — | `OutcomeT` | Command |
| `list_stations` | — | `StationListT` | Command |
| `get_status` | — | `ChassisStatusT` | Command |
| `move_relative` | `dx`, `dy`, `dtheta` | `MoveRelativeOperation` | Operation |
| `navigate_to_station` | `station_id`, `mode` | `NavigateToStationOperation` | Operation |
| `relocalize` | `pose` | `RelocalizeOperation` | Operation |

Command default `timeout_ms`: 2000 for `set_velocity`, 5000 for `stop` / `list_stations`, 3000 for all others (all overridable). All parameters are keyword-only.

## Methods

All method parameters are keyword-only. Command timeouts and Operation polling / cancel are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### stop

Stop chassis motion immediately.

```python
stop(*, timeout_ms: int = 5000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `5000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `bool` | Whether the command succeeded |
| `statusMessage` | `str` | Status text |

### set_max_speed

Set the maximum speed limits.

```python
set_max_speed(*, linear: float, angular: float, timeout_ms: int = 3000) -> MaxSpeedAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `linear` | `float` | (required) | Maximum linear speed in m/s |
| `angular` | `float` | (required) | Maximum angular speed in rad/s |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`MaxSpeedAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `appliedLinear` | `float` | Actually applied maximum linear speed (m/s) |
| `appliedAngular` | `float` | Actually applied maximum angular speed (rad/s) |

```python
applied = robot.chassis.set_max_speed(linear=0.5, angular=0.8)
print(applied.outcome.success, applied.appliedLinear, applied.appliedAngular)
```

### get_max_speed

Read the current maximum speed limits.

```python
get_max_speed(*, timeout_ms: int = 3000) -> MaxSpeedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`MaxSpeedT`: `linear` (m/s), `angular` (rad/s).

### set_max_acceleration

Set the maximum acceleration limits.

```python
set_max_acceleration(*, linear: float, angular: float, timeout_ms: int = 3000) -> MaxAccelerationAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `linear` | `float` | (required) | Maximum linear acceleration in m/s² |
| `angular` | `float` | (required) | Maximum angular acceleration in rad/s² |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`MaxAccelerationAppliedT`: `outcome` (`OutcomeT`), `appliedLinear`, `appliedAngular`; same meaning as `set_max_speed`.

### get_max_acceleration

Read the current maximum acceleration limits.

```python
get_max_acceleration(*, timeout_ms: int = 3000) -> MaxAccelerationT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`MaxAccelerationT`: `linear` (m/s²), `angular` (rad/s²).

### set_velocity

Send a velocity command.

```python
set_velocity(*, vx: float, vy: float, vtheta: float, timeout_ms: int = 2000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `vx` | `float` | (required) | Forward linear speed in m/s |
| `vy` | `float` | (required) | Lateral linear speed in m/s |
| `vtheta` | `float` | (required) | Angular speed in rad/s |
| `timeout_ms` | `int` | `2000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)   # m/s, rad/s
# ... after moving for a while, stop
outcome = robot.chassis.stop()
print(outcome.success, outcome.statusMessage)
```

### pause

Pause the current motion or navigation task.

```python
pause(*, timeout_ms: int = 3000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

### resume

Resume a motion or navigation task paused by `pause`.

```python
resume(*, timeout_ms: int = 3000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
robot.chassis.pause()
# ... confirm the surroundings are safe
robot.chassis.resume()
```

### list_stations

List the navigation stations on the map.

```python
list_stations(*, timeout_ms: int = 5000) -> StationListT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `5000` | Command timeout (milliseconds) |

**Returns**

`StationListT`:

| Field | Type | Description |
|-------|------|-------------|
| `stations` | `list[StationInfoT]` | Station list; each entry has `stationId` (`int`) and `name` (`str`) |
| `statusMessage` | `str` | Status text |

```python
result = robot.chassis.list_stations()
for station in result.stations:
    print(station.stationId, station.name)
```

### get_status

Read a snapshot of the chassis motion status.

```python
get_status(*, timeout_ms: int = 3000) -> ChassisStatusT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`ChassisStatusT`:

| Field | Type | Description |
|-------|------|-------------|
| `pose` | `Pose2dT` \| `None` | Current pose: `x` / `y` (meters), `theta` (radians) |
| `velocity` | `Twist2dT` \| `None` | Current velocity: `vx` / `vy` (m/s), `vtheta` (rad/s) |
| `socPercent` | `int` | Battery percentage |
| `controlMode` | `ControlMode` | Control mode: `MANUAL` / `AUTONOMOUS` |
| `motionState` | `MotionState` | Motion state: `IDLE` / `MOVING` / `PAUSED` / `FAULTED` |
| `targetStationId` | `int` | Current target station id |
| `statusMessage` | `str` | Status text |

```python
status = robot.chassis.get_status()
print(status.motionState, status.socPercent, status.pose.x, status.pose.y)
```

### move_relative

Run a long-running move relative to the current pose. Returns a pollable, cancelable Operation.

```python
move_relative(*, dx: float, dy: float, dtheta: float) -> MoveRelativeOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `dx` | `float` | (required) | Forward displacement in meters |
| `dy` | `float` | (required) | Lateral displacement in meters |
| `dtheta` | `float` | (required) | Rotation in radians |

**Returns**

`MoveRelativeOperation`. Use `get()` / `events()` for snapshots, or `cancel()`. Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether the snapshot is terminal |
| `feedback` | `ChassisProgressT` \| `None` | `progress` (`float`), `statusMessage` (`str`), `taskId` (`int`) |
| `result` | `ChassisOutcomeT` \| `None` | `success` (`bool`), `statusMessage` (`str`), `taskId` (`int`) |
| `error` | `FabotError` \| `None` | Failure reason |

```python
op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### navigate_to_station

Navigate to a station. Returns a pollable, cancelable Operation. Snapshot fields match `move_relative`: `state` / `feedback: ChassisProgressT` / `result: ChassisOutcomeT` / `error`. The handle supports `cancel()`.

```python
navigate_to_station(*, station_id: int, mode: NavigationMode) -> NavigateToStationOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `station_id` | `int` | (required) | Target station id, from `list_stations()` |
| `mode` | `NavigationMode` | (required) | `AUTONOMOUS` / `LINE_FOLLOW` / `POINT_TO_POINT` |

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.list_stations().stations
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId, mode=NavigationMode.AUTONOMOUS,
)
snap = op.get(timeout_ms=60000)
print(snap.state, snap.result)
```

### relocalize

Relocalize the chassis at the given pose. Returns a pollable, cancelable Operation. Snapshot fields match `move_relative`.

```python
relocalize(*, pose: Pose2dT) -> RelocalizeOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pose` | `Pose2dT` | (required) | Relocalization pose: `x` / `y` (meters), `theta` (radians) |

```python
from fabot.types.Pose2d import Pose2dT

pose = Pose2dT()
pose.x, pose.y, pose.theta = 1.0, 2.0, 0.0
op = robot.chassis.relocalize(pose=pose)
```

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md) for shared channel usage.

## Events

Subscribe via `robot.chassis.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.chassis.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.chassis.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.chassis.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.chassis.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.chassis.faults()`, which returns `Faults`.

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

This module has no `status()`. Use [`get_status()`](#get_status) for a chassis motion snapshot; for aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

`move_relative` / `navigate_to_station` / `relocalize` share one chassis resource; new tasks queue and do not run concurrently.
