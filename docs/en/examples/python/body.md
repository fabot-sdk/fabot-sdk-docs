---
title: Body
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Body

Control the torso joints and the waist lift / forward reach / pitch. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the API in [Body](../../reference/python/body.md).

## Waist pose motion

`move_waist` describes the waist with a `WaistPose`: `x` is forward reach, `z` lift, `phi` pitch (radians), all absolute goals (m / m / rad). Use `move_waist_relative` for increments.

```python
from fabot import Robot
from fabot.capabilities.body import WaistPose
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    op = robot.body.move_waist(WaistPose(x=0.05, z=0.10, phi=0.0), duration=3.0)
    snap = op.get(timeout=15.0)
    if snap.state is not OperationState.Succeeded:
        print("failed:", snap.error)
    else:
        print("waist pose:", robot.body.get_pose().z)
```

All body motion Operations share the `body` resource with policy `queue` and a 60-second default budget.

## Waist velocity servo

For continuous speed control use `servo_waist_twist`: `lift` / `turn` / `pitch` are normalized ratios in [-1, 1], positive meaning up, left and forward.

```python
robot.body.servo_waist_twist(lift=0.2, turn=0.0, pitch=0.0)
robot.body.servo_waist_twist(lift=0.0, turn=0.0, pitch=0.0)     # stop
```

## Torso joint motion

`move_joint` takes the 4-DoF torso joint angles (`JointPositions`, radians); `move_joint_path` follows a waypoint sequence.

```python
from fabot.types import JointPositions

joints = list(robot.body.get_joint().positions)
joints[1] += 0.05
robot.body.move_joint(JointPositions(positions=joints), duration=2.0).wait(timeout=30.0)
```

## Torso constraint mode

Under whole-body control the torso can follow freely, hold a relative attitude, track explicitly, lock, or couple with the head:

```python
from fabot.capabilities.body import BodyMode

robot.body.set_mode(BodyMode.TRACKING)    # explicit 6D tracking
robot.body.set_mode(BodyMode.FREE)        # back to a redundant degree of freedom
print(robot.body.get_mode())
```

## Subscribe to the pose stream

`joint()` pushes `JointState` and `pose()` pushes `Pose3d`:

```python
ch = robot.body.pose(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.z)
finally:
    ch.close()
```
