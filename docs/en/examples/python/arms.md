---
title: Dual-Arm Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Dual-Arm Motion

Move both arms together by joint angles or end-effector poses, switch coupling and impedance modes, and subscribe to joint streams. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the API in [Arms](../../reference/python/arms.md).

## Move joints to target angles

Read the current dual-arm joints, adjust them, then call `move_joint` and poll with `events()` until terminal. Each side of `DualJoints` is a `JointPositions` (radians).

```python
from fabot import Robot
from fabot.capabilities.arms import DualJoints
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["arms"])

    state = robot.arms.get_joint()
    left = list(state.left.positions)
    right = list(state.right.positions)
    left[1] += 0.1

    op = robot.arms.move_joint(
        DualJoints(left=JointPositions(positions=left), right=JointPositions(positions=right)),
        duration=3.0,
    )
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.terminal:
            break

    if snap.state is OperationState.Succeeded:
        print("arrived")
    else:
        print("failed:", snap.error)
```

Note: every dual-arm motion Operation shares the `arms` resource with policy `queue`.

## Whole-body joint and pose servo

For high-rate outer loops use `servo_pose` (a short command): one goal per call, returning the applied poses.

```python
from fabot.types import Pose3d

left_goal = Pose3d(x=0.35, y=0.15, z=0.30, qw=1.0, frame_id="torso_link")
right_goal = Pose3d(x=0.35, y=-0.15, z=0.30, qw=1.0, frame_id="torso_link")
applied = robot.arms.servo_pose(left=left_goal, right=right_goal)
print(applied.left, applied.right)
```

## Coupling and impedance drag

`ArmsMode.COUPLED` holds the relative end-effector pose captured at the moment coupling is enabled; `ImpedanceMode` supports guided drag teaching, and `DISABLED` returns to rigid position control.

```python
from fabot.capabilities.arms import ArmsMode, ImpedanceMode

robot.arms.set_mode(ArmsMode.COUPLED)        # lock the relative pose
# ... move both arms together ...

robot.arms.set_impedance(ImpedanceMode.LOW)  # light compliance, draggable by hand
# ... drag manually ...
robot.arms.set_impedance(ImpedanceMode.DISABLED)

robot.arms.set_mode(ArmsMode.INDEPENDENT)    # back to independent arms
```

## Brakes and limits

`set_brake(open=True)` releases both brakes and returns a `DualBrakeState` (`left_open` / `right_open`). Velocity and acceleration limits apply to the pair:

```python
brakes = robot.arms.set_brake(open=True)
print(brakes.left_open, brakes.right_open)

robot.arms.set_joint_velocity_limit(1.0)     # rad/s
robot.arms.set_linear_velocity_limit(0.2)    # m/s
print(robot.arms.get_joint_velocity_limit(), robot.arms.get_linear_velocity_limit())
```

## Subscribe to joint streams

The `joint()` channel pushes `DualJointState` (`left` / `right` share one timestamp); `pose()` pushes `DualPose`:

```python
ch = robot.arms.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.left.positions, frame.payload.right.positions)
finally:
    ch.close()
```
