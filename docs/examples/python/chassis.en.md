---
title: Navigation
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Navigation

Run a navigation task and track progress. See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model and [Chassis](../../reference/python/chassis.md) for the API.

## Navigate to a Station

`navigate_to_station` returns a long-running Operation: poll progress snapshots via `events()` and read the result once a terminal state is reached. The target is an integer `station_id` from `list_stations()`; the navigation `mode` is required: `AUTONOMOUS` (autonomous), `LINE_FOLLOW` (line following), or `POINT_TO_POINT` (point to point).

```python
from fabot import Robot
from fabot.capabilities.chassis import NavigationMode
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    stations = robot.chassis.list_stations().stations
    if not stations:
        raise RuntimeError("no navigation stations on the map")
    for station in stations:
        print(station.stationId, station.name)

    op = robot.chassis.navigate_to_station(
        station_id=stations[0].stationId,
        mode=NavigationMode.AUTONOMOUS,
    )
    for snap in op.events(poll_timeout_ms=200, timeout_ms=120000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("Arrived:", snap.result.statusMessage)
    else:
        print("Failed:", snap.error)
```

Notes:

- The snapshot's `feedback` is a `ChassisProgressT` (`progress` / `statusMessage` / `taskId`) and may be `None` right after the task starts.
- The terminal snapshot's `result` is a `ChassisOutcomeT` (`success` / `statusMessage` / `taskId`); read `error` for the failure reason — see [Error Handling](../../usage/errors.md).
- Chassis tasks share a single resource: new tasks queue and never run concurrently, see [Chassis](../../reference/python/chassis.md).

## Cancel and Pause

While navigation is running you can cancel it, or pause and resume with `pause()` / `resume()`:

```python
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId,
    mode=NavigationMode.AUTONOMOUS,
)

# To abort the task:
snap = op.cancel()
print(snap.state)   # OperationState.Canceled

# Or stop temporarily and continue once safe:
robot.chassis.pause()
# ... confirm the surroundings are safe
robot.chassis.resume()
```

## Query Chassis Status

Before or after navigation, use `get_status()` to read a snapshot of pose, velocity, and motion state:

```python
status = robot.chassis.get_status()
print(status.motionState, status.targetStationId)
print(status.pose.x, status.pose.y, status.pose.theta)
```

`pose` is a `Pose2dT` (`x` / `y` in meters, `theta` in radians); the full field list is under [Chassis get_status](../../reference/python/chassis.md#get_status).
