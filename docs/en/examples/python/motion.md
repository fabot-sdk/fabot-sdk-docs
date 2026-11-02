---
title: Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Motion

Query and switch the whole-body motion regime, read whole-body control state and center-of-mass margin, and run homing plus whole-body motions. The command and timeout model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the full API in [Motion](../../reference/python/motion.md).

## Query and switch the motion regime

`get_mode` / `set_mode` are Commands. `MotionMode` is `HOLD` / `OCS2` / `MOVEJ` / `COMPLIANCE`; `COMPLIANCE` has no reachable state on the current control stack, so `set_mode` rejects it.

```python
from fabot import Robot
from fabot.capabilities.motion import MotionMode

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["motion"])

    print("current regime:", robot.motion.get_mode())

    if robot.motion.get_mode() is not MotionMode.OCS2:
        applied = robot.motion.set_mode(MotionMode.OCS2)
        print("switched to:", applied)
```

Notes:

- `set_mode` returns the applied regime, which may differ from the request; trust the return value. Its default timeout is 7 seconds because the controller must confirm.
- All five motion Operations (`move_home` / `move_preset` / `move_joint` / `move_joint_path` / `move_pose`) share the `motion_controller` resource with policy `queue` and a 60-second default budget.

## Whole-body control state and center of mass

`get_wbc_state()` reports the per-part constraint modes and enables; `get_center_of_mass()` reports the projection and its margin:

```python
wbc = robot.motion.get_wbc_state()
print(wbc.body_mode, wbc.head_mode, wbc.arms_mode)
print(wbc.left_arm_enabled, wbc.right_arm_enabled, wbc.chassis_locked)

com = robot.motion.get_center_of_mass()
print(com.position, com.status, com.min_safe_margin)   # status is SupportStatus
```

## Homing

`move_home` moves to a preset home pose; `HomePose.PRIMARY` is the default:

```python
from fabot.capabilities.motion import HomePose

robot.motion.move_home(HomePose.PRIMARY, duration=5.0).wait(timeout=60.0)
```

`move_preset` moves to a named preset defined by the robot configuration:

```python
robot.motion.move_preset("carry", duration=4.0).wait(timeout=60.0)
```

## Whole-body joint and pose goals

`move_joint` accepts a `WholeBodyJointTarget`: all four parts are optional, and an omitted part keeps its current joints.

```python
from fabot.capabilities.motion import WholeBodyJointTarget
from fabot.types import JointPositions

target = WholeBodyJointTarget(
    left_arm=JointPositions(positions=[0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0]),
    body=JointPositions(positions=[0.0, 0.05, 0.0, 0.0]),
)
robot.motion.move_joint(target, duration=3.0).wait(timeout=60.0)

# Whole-body pose servo (short cycle)
# robot.motion.servo_pose(left_arm=left_pose, right_arm=right_pose, body=body_pose)
```

## One shot and streaming

Take one sample with `get_joint()`; follow continuously with the `joint()` channel, whose frame `payload` is a `WholeBodyJointState` (`body` / `left_arm` / `right_arm` / `head`, each a `JointState`):

```python
state = robot.motion.get_joint()
print(state.left_arm.positions, state.body.positions)

ch = robot.motion.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.left_arm.positions)
finally:
    ch.close()
```

`wbc_state()` and `center_of_mass()` are the other two channels, carrying `WbcState` and `CenterOfMass`.
