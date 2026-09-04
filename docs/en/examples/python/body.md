---
title: Body
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Body

Control the torso joints and the waist lift / turn. For the long-running task model see [Commands & Operations](../../usage/commands-operations.md), for channel usage see [Events & Data Channels](../../usage/events-channels.md), and for the interface see [Body](../../reference/python/body.md).

## Relative waist lift

`move_waist` returns a long-running Operation: `mode=RELATIVE` means a relative increment — for a pure lift pass `x=0, phi=0` and only set `z` (meters); with `wait=True` the task ends only after reaching the target or timing out. Poll progress snapshots via `events()`, then read `result` / `error` at the terminal state.

```python
from fabot import Robot
from fabot.capabilities.body import WaistMoveMode
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    op = robot.body.move_waist(
        mode=WaistMoveMode.RELATIVE, x=0.0, z=0.05, phi=0.0, wait=True,
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

- The snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the task starts; the terminal `result` is an `OutcomeT` (`success` / `statusMessage`).
- With `mode=ABSOLUTE`, `x` / `z` are the absolute pose in `base_footprint` and `phi` is the torso heading angle (radians).
- `move_joints` / `move_waist` share the same torso resource; new tasks are queued — see [Body](../../reference/python/body.md).

## Velocity-scaled lift control

`set_waist_lift_velocity` drives the waist lift by a normalized scale in `[-1, 1]`: positive lifts up, negative lowers down; send `0` to stop. It returns a `WaistLiftVelocityAppliedT` with the actually applied value.

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    applied = robot.body.set_waist_lift_velocity(velocity_scale=0.5)
    print("applied:", applied.outcome.success, "velocity scale:", applied.appliedVelocityScale)

    # ... stop after reaching the target height
    stop = robot.body.set_waist_lift_velocity(velocity_scale=0.0)
    print(stop.outcome.statusMessage)
```

Use `set_waist_turn_velocity` for waist rotation — same parameters and return fields. Use `set_velocity` for the joint interpolation duration (seconds; larger means slower motion).

## Subscribe to the joint position stream

`joints()` opens the joint position channel; iterate frames with `frames()` and `close()` to release it. Each frame's `payload.positions` holds the joint angles (radians).

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    ch = robot.body.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

For frame fields (`channel_id` / `sequence` / `timestamp_us` / `payload`) and `qos_profile` values (`"latest"` / `"realtime"` / `"reliable"`) see [Body joints](../../reference/python/body.md#joints).

## Related links

- [Commands & Operations](../../usage/commands-operations.md)
- [Events & Data Channels](../../usage/events-channels.md)
- [Body API Reference](../../reference/python/body.md)
