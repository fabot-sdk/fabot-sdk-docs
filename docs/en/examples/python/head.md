---
title: Head Motion
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Head Motion

Control the head pitch / yaw joints and track motion progress. See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model and [Head](../../reference/python/head.md) for the API.

## Move the Head to Target Joint Angles

`move_joints` returns a long-running Operation: poll progress snapshots via `events()` and read the result once a terminal state is reached. `positions` is a list of target joint angles in radians; with `wait=True` the task finishes only after arriving or timing out. Motion speed is governed by the interpolation duration: set it first with `set_velocity` (seconds — larger means slower); it applies persistently to all subsequent motions.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    applied = robot.head.set_velocity(velocity=2.0)
    print("interpolation duration applied:", applied.appliedVelocity, "s")

    target = [0.3, 0.5]   # target joint angles (radians)
    op = robot.head.move_joints(positions=target, wait=True)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("Arrived:", snap.result.statusMessage)
    else:
        print("Failed:", snap.error)
```

Notes:

- The snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the task starts.
- The terminal snapshot's `result` is an `OutcomeT` (`success` / `statusMessage`); read `error` for the failure reason — see [Error Handling](../../usage/errors.md).
- `move_joints` occupies the head motion resource: new tasks on the same slot queue and never run concurrently.

## Subscribe to the Joint Position Stream

While the head moves, you can subscribe to the `joints()` channel to watch joint angles in real time; general channel conventions are in [Events & Channels](../../usage/events-channels.md).

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    ch = robot.head.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

Notes:

- `qos_profile` is a string (`"latest"` / `"realtime"` / `"reliable"`), not an enum.
- The frame `payload` is a `JointPositionsT`; `payload.positions` is the joint angle list in radians. Iteration ends naturally when `timeout_ms` expires — remember to `close()` the channel.

## Query Joint Angles and Check Arrival

`get_joints` reads the current joint angles and `check_arrive` checks whether the target has been reached:

```python
positions = robot.head.get_joints()
print("current joint angles:", positions)
print("current interpolation duration:", robot.head.get_velocity(), "s")

arrived = robot.head.check_arrive(threshold=0.05, target_joints=[])
print("arrived:", arrived)
```

`threshold` is the joint-space L2 tolerance in radians; passing an empty `target_joints` list checks against the target most recently issued by `move_joints`.

## Related Links

- [Head API Reference](../../reference/python/head.md)
- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Channels](../../usage/events-channels.md)
