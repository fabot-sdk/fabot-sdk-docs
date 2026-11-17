---
title: Lift example
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Lift example

`robot.lift` controls the height of the lift column. Mechanics and the full signature list are in [Lift](../../reference/python/lift.md).

## Check availability after connecting

Not every robot carries a lift. Gate on `has_adapter` before reading state:

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    if not robot.lift.has_adapter:
        raise SystemExit("this robot has no lift")
    st = robot.lift.get_height()
    print("height:", st.height, "homed:", st.homed, "enabled:", st.enabled)
```

When the slot is unbound, `get_height()` is still dispatched and fails or times out; `has_adapter` is the only reliable precondition.

## Enable → home → position

After a cold start the axis normally needs homing before it accepts absolute targets:

```python
if robot.lift.has_adapter:
    robot.lift.set_enable(True)
    if not robot.lift.get_height().homed:
        robot.lift.move_home().wait(timeout=30.0)

    op = robot.lift.move_height(0.45, tolerance=0.005)
    snap = op.get(timeout=20.0)
    print(snap.state, snap.feedback.progress if snap.feedback else None)
```

`move_height` returns an Operation: `get()` pulls a snapshot, `wait()` blocks for the terminal state, `cancel()` makes a best-effort cancel. See [Commands and long-running operations](../../usage/commands-operations.md).

## Relative moves and speed limits

```python
robot.lift.set_velocity_limit(0.1)          # metres/s, persists
robot.lift.move_height_relative(-0.05).wait(timeout=10.0)
```

The limit persists: one write applies to every later move. For small, precise grasp-height corrections, slow down first.

## Track an external height source

`servo_height()` is a short-cycle servo, useful for following a sensor or a joystick:

```python
for target in stream_from_your_source():
    robot.lift.servo_height(target)
```

:::warning The servo does not stop by itself
Each `servo_height()` call sends one target. You must call `stop()` when you are done; a dropped connection does not guarantee the lift stops. See [Servo and safety](../../usage/concurrency-and-safety.md).
:::

## Read the height stream

```python
ch = robot.lift.height(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.height, frame.payload.moving)
finally:
    ch.close()
```

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Move command rejected | Axis not enabled | Call `set_enable(True)` first |
| Absolute target rejected | Not homed (`homed` is `False`) | Run `move_home()` first |
| `move_height` stays `Queued` | Another Operation owns the resource | Wait for it, or `cancel()` it |
| Every height reading shifted | Someone called `set_height_zero()` | Re-home and confirm the zero definition |
