---
title: Gripper
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Gripper

Control the left / right gripper opening, velocity and force limits, and subscribe to the opening stream. The two grippers share one API on independent slots (`robot.left_gripper` / `robot.right_gripper`). The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), channels in [Events & Data Channels](../../usage/events-channels.md), and the API in [Gripper](../../reference/python/gripper.md).

## Set limits and move

Velocity and force limits are persistent settings, not per-call arguments: call `set_velocity_limit` / `set_force_limit` first, then `move_opening`. Opening ranges from 0 (closed) to 1 (open).

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_gripper"])

    robot.left_gripper.set_velocity_limit(0.5)
    robot.left_gripper.set_force_limit(20.0)

    print("current opening:", robot.left_gripper.get_opening())

    op = robot.left_gripper.move_opening(1.0, duration=1.0)   # fully open
    snap = op.get(timeout=5.0)
    print(snap.state is OperationState.Succeeded, robot.left_gripper.get_opening())
```

Note: `opening` and `joint[0]` map to the same actuator on the current adapter and both read back from the same joint position; `duration` is a wait budget rather than a trajectory duration, and speed is governed by the velocity limit.

## Opening servo

For continuous tracking use `servo_opening` (a short command), which returns the applied opening:

```python
for target in (0.2, 0.5, 0.8):
    print(target, robot.right_gripper.servo_opening(target))
```

## Physical-stroke control

`move_joint` takes a `Doubles` whose `values` must have length 1; with a percentage-only actuator it equals the opening and is also clamped to [0, 1]:

```python
from fabot.types import Doubles

robot.right_gripper.move_joint(Doubles(values=[0.0])).wait(timeout=5.0)   # fully closed
```

## Subscribe to the opening stream

`opening()` pushes `Float64` (`value` is the opening) and `joint()` pushes `JointState`:

```python
ch = robot.left_gripper.opening(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.value)
finally:
    ch.close()
```
