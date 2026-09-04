---
title: Dual-Arm Motion
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Dual-Arm Motion

Move both arms by joint angles or end-effector poses, and subscribe to the joint position stream. For the long-running task model see [Commands & Operations](../../usage/commands-operations.md), for channel usage see [Events & Data Channels](../../usage/events-channels.md), and for the interface see [Arms](../../reference/python/arms.md).

## Move joints to target angles

Read the current joint angles first, adjust one of them, then issue `move_joints`, polling progress via `events()` until a terminal state. `positions` is the left arm's joint angles followed by the right arm's (commonly 14 in total), in radians.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["arms"])

    positions = robot.arms.get_joints()
    print("current joints:", positions)
    positions[1] += 0.2  # rotate the 2nd joint of the left arm by 0.2 rad

    op = robot.arms.move_joints(positions=positions, wait=True)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("reached:", snap.result.statusMessage)
    else:
        print("failed:", snap.error)
```

Notes:

- `wait=True` means the task ends only after reaching the target or timing out.
- The progress snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the task starts; the terminal `result` is an `OutcomeT` (`success` / `statusMessage`). Read `error` for the failure reason — see [Error Handling](../../usage/errors.md).
- `move_joints` / `move_dual_arm_pose` / `move_dual_arm_path` share the same resource; new tasks are queued.

## Move both end-effectors to target poses

`move_dual_arm_pose` smoothly moves both end-effectors into place at the same time: `poses` must have length 2 (left arm, then right arm), and `frame_id` selects the reference frame (`arm_base` / `base_footprint` / `body_link4`). This example raises both end-effectors by 5 cm relative to the current pose read from `get_pose()`, and waits for the terminal state in one call with `get()`:

```python
current = robot.arms.get_pose()
print("frame:", current.frameId)
left, right = current.poses
print("left end-effector:", left.x, left.y, left.z)

left.z += 0.05   # raise the left end-effector by 5 cm
right.z += 0.05
op = robot.arms.move_dual_arm_pose(poses=[left, right], wait=True, frame_id="arm_base")
snap = op.get(timeout_ms=30000)
if snap.result is not None:
    print(snap.state, snap.result.success, snap.result.statusMessage)
else:
    print(snap.state, snap.error)
```

An end-effector pose is a `Pose3dT`: `x` / `y` / `z` in meters, `qx` / `qy` / `qz` / `qw` as the orientation quaternion. Dual-arm Cartesian motion only goes through `move_dual_arm_*`; do not use it in parallel with the single-arm interfaces.

## Subscribe to the joint position stream

`joints()` opens the dual-arm joint position channel; iterate frames with `frames()` and `close()` when done:

```python
ch = robot.arms.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)
finally:
    ch.close()
```

`payload` is a `JointPositionsT`; `payload.positions` holds the left arm's joint angles followed by the right arm's (radians). Use the `pose()` channel for the pose stream; see [Arms](../../reference/python/arms.md) for the frame structure.

## Related links

- [Arms API Reference](../../reference/python/arms.md)
- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Data Channels](../../usage/events-channels.md)
