---
title: Arm Motion
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Arm Motion

Drive the left arm (`robot.left_arm`) or right arm (`robot.right_arm`) with joint-space and end-effector-pose motions, and subscribe to live state streams. See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model, [Events & Channels](../../usage/events-channels.md) for channel usage, and [Arm](../../reference/python/arm.md) for the full API.

## Enable and Run a Joint Motion

Enable the arm with `set_enabled` before moving; `move_joints` returns a long-running Operation — poll progress via `events()` and read the result once a terminal state is reached. The target `positions` are joint angles in radians, one per joint; `wait=True` means the task ends only after reaching the target or timing out.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_arm"])

    outcome = robot.left_arm.set_enabled(enabled=True)
    print(outcome.success, outcome.statusMessage)

    positions = robot.left_arm.get_joints()
    positions[1] += 0.2   # rotate the 2nd joint by 0.2 rad
    op = robot.left_arm.move_joints(positions=positions, wait=True)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("Reached:", snap.result.statusMessage)
    else:
        print("Failed:", snap.error)
```

Notes:

- The snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the task starts; the terminal `result` is an `OutcomeT` (`success` / `statusMessage`) — read `error` for the failure reason, see [Error Handling](../../usage/errors.md).
- `move_joints` / `move_pose` on the same arm share a single resource: new tasks queue; call `op.cancel()` to abort a running task.

## Move to an End-Effector Pose

`move_pose` targets an end-effector pose: `pose` is a `Pose3dT` (`x` / `y` / `z` in meters, `qx` / `qy` / `qz` / `qw` quaternion); `mode` is `PoseMoveMode.SMOOTH` (smooth) or `PoseMoveMode.DIRECT` (direct); `frame_id` is the reference frame, an empty string means `arm_base`.

```python
from fabot.capabilities.arm import PoseMoveMode
from fabot.types.Pose3d import Pose3dT

pose = Pose3dT()
pose.x, pose.y, pose.z = 0.3, 0.0, 0.4
pose.qw = 1.0   # identity quaternion, no rotation

op = robot.right_arm.move_pose(
    pose=pose, mode=PoseMoveMode.SMOOTH, wait=True, frame_id="arm_base",
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## Subscribe to the Joint Positions Stream

`joints()` opens the joint positions stream; iterate frames with `frames()` and call `close()` when done. Each frame's `payload` is a `JointPositionsT`, and `payload.positions` holds the joint angles in radians. The end-effector pose stream via `pose()` works the same way.

```python
ch = robot.left_arm.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)
finally:
    ch.close()
```

## See Also

- [Arm](../../reference/python/arm.md)
- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Channels](../../usage/events-channels.md)
