---
title: Head Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Head Motion

Control head yaw / pitch joints and track motion progress. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), the API in [Head](../../reference/python/head.md).

## Move to target joint angles

`move_joint` returns a long-running Operation: stream progress with `events()` and read the result once terminal. Joint order is fixed as `[yaw, pitch]` in radians.

```python
from fabot import Robot
from fabot.capabilities.head import HeadMode
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    print("current mode:", robot.head.get_mode())
    print("current joints:", robot.head.get_joint().positions)

    op = robot.head.move_joint(JointPositions(positions=[0.3, -0.2]), duration=1.5)
    snap = op.get(timeout=10.0)
    if snap.state is not OperationState.Succeeded:
        print("failed:", snap.error)
```

Head motion Operations share the `head` resource with policy `queue`.

## Head modes

`HeadMode` decides how the head behaves under whole-body control: `DISABLE` turns the head task off, `FORWARD` locks it forward, `TRACKING` follows a 6D goal, and in `GAZE` the pose position is the gaze point.

```python
robot.head.set_mode(HeadMode.TRACKING)
print(robot.head.get_mode())

# Gaze at a point in space (under GAZE the Pose3d position is the gaze point)
from fabot.types import Pose3d
robot.head.set_mode(HeadMode.GAZE)
robot.head.servo_pose(Pose3d(x=1.0, y=0.2, z=1.2, qw=1.0))
```

## Pose motion

`move_pose` moves the head by end-effector pose; `servo_pose` is the short-cycle servo and also accepts individual components:

```python
robot.head.move_pose(
    Pose3d(x=0.1, y=0.0, z=0.05, qw=1.0, frame_id="base_link"),
    duration=1.0,
).wait(timeout=10.0)

robot.head.servo_pose(y=0.1)
```

## Tune speed and arrival thresholds

```python
robot.head.set_joint_velocity_limit(1.5)      # rad/s
robot.head.set_joint_acceleration_limit(5.0)  # rad/s²

applied = robot.head.set_arrival_thresholds(joint_tolerance=0.01, max_timeout_s=3.0)
print(applied.outcome.success)
```

## Subscribe to the joint stream

```python
ch = robot.head.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)   # [yaw, pitch]
finally:
    ch.close()
```
