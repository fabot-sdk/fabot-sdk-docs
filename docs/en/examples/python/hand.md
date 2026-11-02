---
title: Dexterous Hand
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Dexterous Hand

Control dexterous hand opening, read five-finger tactile arrays, and subscribe to opening and tactile streams. Both hands share one API on independent slots (`robot.left_hand` / `robot.right_hand`). The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), the API in [Hand](../../reference/python/hand.md).

## Control the fingers

Velocity and force limits are persistent; both opening and joint angles are lists ordered like the controller `joints`. An opening of 0 means the controller's closed configuration and 1 the open one.

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_hand"])

    n = len(robot.right_hand.get_opening())
    robot.right_hand.set_velocity_limit([0.5] * n)
    robot.right_hand.set_force_limit([20.0] * n)

    opening = [1.0] * n                       # fully open
    op = robot.right_hand.move_opening(opening, duration=2.0)
    snap = op.get(timeout=10.0)
    print(snap.state is OperationState.Succeeded, robot.right_hand.get_opening())
```

Hand motion Operations share the `hand` resource with policy `queue`.

## Joint control in radians

`move_joint` takes radians (length matching the controller `joints`) and `tolerance` is in radians too; a `duration` of 0 uses the slot `max_timeout_s` (10 seconds by default).

```python
joints = list(robot.right_hand.get_joint().positions)
joints[0] += 0.3
robot.right_hand.move_joint(joints, tolerance=0.05).wait(timeout=10.0)
```

For waypoints use `move_joint_path` with a list of `JointPositions`:

```python
from fabot.types import JointPositions

robot.right_hand.move_joint_path(
    [JointPositions(positions=joints), JointPositions(positions=[0.0] * len(joints))],
    duration=3.0,
).wait(timeout=15.0)
```

## Read the tactile arrays

`get_tactile()` returns a `HandTactile` with one `FingerTactile` per finger (`rows` / `cols` / `values` in row-major order / `total_force`):

```python
tactile = robot.right_hand.get_tactile()
print(tactile.timestamp_us)
for finger in ("thumb", "index", "middle", "ring", "pinky"):
    pad = getattr(tactile, finger)
    if pad is not None:
        print(finger, pad.total_force, len(pad.values))
```

## Subscribe to streams

`opening()` pushes `Doubles` (per-joint opening), `joint()` pushes `JointState`, and `tactile()` pushes `HandTactile`:

```python
ch = robot.right_hand.tactile(qos_profile="realtime")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.index.total_force)
finally:
    ch.close()
```
