---
title: Navigation
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Navigation

Run chassis navigation tasks and track progress. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), the API in [Chassis](../../reference/python/chassis.md).

## Navigate to a station

`move_station` returns a long-running Operation: stream progress snapshots with `events()` and read the result once terminal. The station is addressed by integer id from `get_station()`; `mode` defaults to `AUTONOMOUS` and also accepts `LINE_FOLLOW` / `POINT_TO_POINT`.

```python
from fabot import Robot
from fabot.capabilities.chassis import NavigationMode
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    stations = robot.chassis.get_station()
    if not stations:
        raise RuntimeError("no stations on the map")
    for station in stations:
        print(station.id, station.name, station.pose)

    op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=120000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.status_message)
        if snap.terminal:
            break

    if snap.state is OperationState.Succeeded:
        print("arrived:", snap.result.status_message)
    else:
        print("failed:", snap.error)
```

Notes:

- `feedback` is a `Progress` (`progress` / `status_message`) and may be `None` right after submission.
- The terminal `result` is an `Outcome`; failures are read from `error`, see [Error Handling](../../usage/errors.md).
- Navigation Operations share the `chassis` resource with policy `queue` and a 180-second default budget, see [Chassis](../../reference/python/chassis.md).

## Navigate by pose

Besides stations you can give a map-frame pose or a body-frame relative displacement:

```python
from fabot.types import Pose2d

# Absolute map pose (theta is the heading in radians)
robot.chassis.move_pose(Pose2d(x=1.2, y=0.4, theta=1.57), position_tolerance=0.05).wait(timeout=120.0)

# Body-frame relative move: target.x / y / theta are dx / dy / dyaw
robot.chassis.move_pose_relative(Pose2d(x=0.5, y=0.0, theta=0.0)).wait(timeout=120.0)
```

## Velocity servo and manual mode

Short adjustments can use the velocity servo. `servo_twist` is only allowed in `ChassisMode.MANUAL`:

```python
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)     # stop
print(robot.chassis.get_twist())
```

## Cancelling and pausing

Navigation can be cancelled, or paused and resumed with `set_pause()`; pausing does not drop the `move_*` handle:

```python
op = robot.chassis.move_station(stations[0].id)

snap = op.cancel()
print(snap.state)   # OperationState.Canceled

# Or stop temporarily and continue once the surroundings are clear:
robot.chassis.set_pause(paused=True)
robot.chassis.set_pause(paused=False)
```

## Reading chassis state

Before and after navigation you can read the pose, velocity and motion stage:

```python
pose = robot.chassis.get_pose()          # Pose2d
print(pose.x, pose.y, pose.theta, pose.frame_id)

twist = robot.chassis.get_twist()        # Twist2d
print(twist.vx, twist.vy, twist.vtheta)

stage = robot.chassis.get_stage()        # ChassisStage
print(stage)                             # IDLE / MOVING / PAUSED / FAULTED
```

`ChassisStage` is a read-only projection of tasks and faults with no setter. Parking and locking have their own `get_parking()` / `set_parking()` and `get_lock()` / `set_lock()`. Full field tables are in [Chassis](../../reference/python/chassis.md).
