---
title: Dexterous Hand
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Dexterous Hand

Control the dexterous hand's joint opening/closing and subscribe to the joint aperture stream. The left and right hands share the same API on independent slots (`robot.left_hand` / `robot.right_hand`). For the long-running task model see [Commands & Operations](../../usage/commands-operations.md), and for the interface see [Hand](../../reference/python/hand.md).

## Open and close the fingers

Set the persistent velocity and torque via `set_velocity` / `set_torque` first, then run the long-running motion with `move_joints`: keep pulling progress snapshots via `events()` and read the result at the terminal state. Aperture values should be normalized to 0~1 (0 = curled/closed, 1 = extended/open); the list length depends on the hand configuration.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_hand"])

    current = robot.left_hand.get_joints()
    print("current aperture:", current)

    applied = robot.left_hand.set_velocity(velocity=0.5)
    print("velocity applied:", applied.outcome.success, applied.appliedVelocity)
    applied = robot.left_hand.set_torque(torque=0.3)
    print("torque applied:", applied.outcome.success, applied.appliedTorque)

    op = robot.left_hand.move_joints(
        positions=[0.0, 0.0, 0.0, 0.0, 0.0],  # close all five fingers
        duration_s=5.0,
        position_threshold=0.02,
    )
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

- The `appliedVelocity` / `appliedTorque` returned by `set_velocity` / `set_torque` are the actually applied values and may differ from the requested ones.
- The progress snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the task starts.
- `move_joints` on the same hand exclusively owns that hand's resource; new tasks are queued. Read `error` for the failure reason — see [Error Handling](../../usage/errors.md).

## Subscribe to the joint aperture stream

`joints()` opens the joint aperture channel; iterate frames with `frames()` and call `close()` to release the channel when done.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_hand"])

    ch = robot.right_hand.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

Notes:

- The frame's `payload` is a `JointPositionsT`; each joint's aperture is in `payload.positions`.
- `qos_profile` accepts `"latest"` / `"realtime"` / `"reliable"`; for general channel usage see [Events & Data Channels](../../usage/events-channels.md).

## Related links

- [Hand API Reference](../../reference/python/hand.md)
- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Data Channels](../../usage/events-channels.md)
