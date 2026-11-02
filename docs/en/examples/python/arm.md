---
title: Arm Motion
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Arm Motion

Drive the left (`robot.left_arm`) or right (`robot.right_arm`) arm with joint motion and end-effector pose motion, and subscribe to live state streams. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the full API in [Arm](../../reference/python/arm.md).

## Enable and move the joints

Enable the arm with `set_enable` first; `move_joint` returns a long-running Operation — poll progress with `events()` and read the result once terminal. The goal is a `JointPositions` (radians, one per joint); `duration` is the requested motion time and `0` keeps the controller default.

```python
from fabot import Robot
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_arm"])

    print("enable:", robot.left_arm.set_enable(True))

    positions = list(robot.left_arm.get_joint().positions)
    positions[1] += 0.2                       # rotate joint 2 by 0.2 rad
    op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)

    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
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

- `feedback` is a `Progress` (`progress` / `status_message`) and may be `None` right after submission; the terminal `result` is an `Outcome` (`success` / `status_message`) and failures are read from `error`, see [Error Handling](../../usage/errors.md).
- Every motion Operation on one arm shares the `arm` resource with policy `queue`, so new tasks line up. `op.cancel()` stops the current one.
- `op.wait(timeout=30.0)` is the shortcut for waiting: it returns `result` on success and raises on failure.

## Move by end-effector pose

`move_pose` takes a `Pose3d` (`x` / `y` / `z` in meters, `qx` / `qy` / `qz` / `qw`). The reference frame comes from `target.frame_id` (empty means `arm_base`); `end_frame` empty means the active tool TCP, or the flange without a tool.

```python
from fabot.types import Pose3d

pose = Pose3d(x=0.3, y=0.0, z=0.4, qw=1.0, frame_id="arm_base")   # no rotation

op = robot.right_arm.move_pose(pose, position_tolerance=0.01, duration=3.0)
snap = op.get(timeout=30.0)
print(snap.state, snap.result)

# Relative to the current pose:
# robot.right_arm.move_pose_relative(Pose3d(x=0.05, qw=1.0))
# Through waypoints:
# robot.right_arm.move_pose_path([pose, Pose3d(x=0.35, z=0.45, qw=1.0)])
```

## Read the wrench and run compliance

`get_wrench()` reads the raw wrench and `get_filtered_wrench()` the filtered one; `set_wrench_zero()` performs a zero-offset calibration. Compliance is configured with `set_compliance_mask` / `set_compliance_wrench`.

```python
print(robot.right_arm.get_filtered_wrench())
robot.right_arm.set_wrench_zero()            # zero while unloaded

robot.right_arm.set_compliance_mask([0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
print(robot.right_arm.get_compliance_mask())
```

## Tune arrival thresholds

`set_arrival_thresholds` replaces the slot's arrival criteria; arrival requires two consecutive samples inside the thresholds.

```python
applied = robot.left_arm.set_arrival_thresholds(
    joint_tolerance=0.01,            # joint L2 error in radians
    pose_position_tolerance=0.005,   # position error in meters
    pose_orientation_tolerance=0.02, # 1 - |dot(q, q_target)|
    max_timeout_s=8.0,               # extra arrival budget in seconds
)
print(applied.outcome.success)
if applied.applied is not None:
    print(applied.applied.joint_tolerance, applied.applied.max_timeout_s)
```

## Subscribe to the joint stream

`joint()` opens the joint-state stream; iterate with `frames()` and `close()` when done. The frame `payload` is a `JointState` (`positions` / `velocities` / `efforts` / `stamp_ns`). Use `pose()` for end-effector poses and `wrench()` / `filtered_wrench()` for wrenches.

```python
ch = robot.left_arm.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)
finally:
    ch.close()
```

## Related links

- [Arm](../../reference/python/arm.md)
- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Data Channels](../../usage/events-channels.md)
- [Frames & Transforms](../../usage/frames.md)
