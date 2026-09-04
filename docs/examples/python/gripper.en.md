---
title: Gripper
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Gripper

Control the opening/closing motion, speed, and torque of the left/right gripper, and subscribe to the position stream. Both grippers share the same API as independent slots (`robot.left_gripper` / `robot.right_gripper`). See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model, [Events & Data Channels](../../usage/events-channels.md) for channel usage, and [Gripper](../../reference/python/gripper.md) for the full API.

## Set Speed/Torque and Move

`move_joints` does not carry speed or torque; set the persistent values first via `set_velocity` / `set_torque`. `move_joints` returns a long-running Operation — poll progress snapshots with `events()` until a terminal state.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_gripper"])

    gripper = robot.left_gripper
    print("current positions:", gripper.get_joints())

    applied_v = gripper.set_velocity(velocity=0.5)
    applied_t = gripper.set_torque(torque=0.3)
    print("velocity:", applied_v.appliedVelocity, "torque:", applied_t.appliedTorque)

    op = gripper.move_joints(positions=[0.8], duration_s=0.0, position_threshold=0.0)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=10000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("reached:", snap.result.success)
    else:
        print("failed:", snap.error)
```

Notes:

- The length of `positions` depends on the end-effector definition; a common single-DoF gripper takes length 1. Pass `0.0` for `duration_s` / `position_threshold` to use the defaults (5 seconds / 0.01).
- `set_velocity` / `set_torque` return `ToolSpeedAppliedT` / `TorqueAppliedT`: `outcome.success` tells whether the request was accepted; `appliedVelocity` / `appliedTorque` hold the effective values.
- `move_joints` tasks on the same gripper share one motion resource and queue up; see [Gripper](../../reference/python/gripper.md).

## Subscribe to the Position Stream

Open the position channel with `joints()`, iterate frames with `frames()`, and always `close()` it when done:

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_gripper"])

    ch = robot.right_gripper.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

The frame `payload` is a `JointPositionsT`; `payload.positions` holds the per-joint opening positions. `qos_profile` is a string (`"latest"` / `"realtime"` / `"reliable"`), not an enum — see [Events & Data Channels](../../usage/events-channels.md).
