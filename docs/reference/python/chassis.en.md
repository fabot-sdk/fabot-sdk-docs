---
title: Chassis
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Chassis

## Module Overview

- Capability id: `chassis`; slot: `robot.chassis`
- Chassis motion control: velocity commands, speed-limit settings, station navigation, relocalization.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `set_velocity` | `vx`, `vy`, `vtheta` | `VelocityAppliedT` | Command |
| `stop` | — | — | Command |
| `pause` / `resume` | — | — | Command |
| `set_max_speed` / `get_max_speed` | `vx`, `vtheta` / — | — / speed-limit values | Command |
| `set_max_acceleration` / `get_max_acceleration` | same as above | same as above | Command |
| `list_stations` | — | station list | Command |
| `get_status` | — | status | Command |
| `move_relative` | `dx`, `dy`, `dtheta` | `MoveRelativeOperation` | Operation |
| `navigate_to_station` | `station_id`, `mode: NavigationMode` | `NavigateToStationOperation` | Operation |
| `relocalize` | `pose: Pose2dT` | `RelocalizeOperation` | Operation |

## Methods

### Velocity Control

```python
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)   # m/s, rad/s
robot.chassis.stop()
```

### Station Navigation (Operation)

Long-running tasks return an Operation handle; the snapshot contains `state` / `feedback: ChassisProgressT` / `result: ChassisOutcomeT` / `error`. See [Commands & Operations](../../usage/commands-operations.md) for usage:

```python
op = robot.chassis.navigate_to_station(station_id="charging", mode=NavigationMode.NAVIGATE)
for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### Relocalization

```python
from fabot.types import Pose2dT
op = robot.chassis.relocalize(pose=Pose2dT(x=1.0, y=2.0, theta=0.0))
```

## Channels

## Events

Fault and lifecycle changes are subscribed via `fault_changed` / `lifecycle_changed` on `robot.chassis.events`.

## Faults

## Status

This module has no `status()`; for whole-robot status see `robot.status()`.

## Resources

The navigation resource serves only one task at a time: new tasks are queued or rejected (raising `ResourceConflict`).

!!! todo
    To be completed from `fabot` package type hints: method signatures, `NavigationMode` enum values, and resource policy.
