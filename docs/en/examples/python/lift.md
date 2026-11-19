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

## Home → position

With `require_homed: true` (the template default) absolute height commands require `get_height().homed`. `homed` is a software flag that a successful `move_home` or `set_height_zero` writes to `home.yaml`, so it survives a power cycle; an absolute encoder reports the true position at power-on, so with the flag present, send height commands directly. The flag only disappears after an encoder fault `0x7321`–`0x7328`: rebuild it with `move_home` against the origin switch, or call `set_height_zero` at a known mechanical position. With `require_homed: false`, height commands work unhomed.

Dispatching a command lets the lower layer perform fault recovery and reach Operation Enabled, so `set_enable(True)` is not a prerequisite (it only enables, it does not move); `set_enable(False)` drops torque.

Omitting `duration` and `wait_timeout` gives a server-side budget of `default_wait_timeout_s` (15 s in the template). `wait(timeout=...)` / `get(timeout=...)` only bound that one client-side wait and do not extend the motion; pass seconds to the command's own `wait_timeout` instead. The template stroke is `0`–`0.30` m (`min_height_m` / `max_height_m`), and the target must fall inside it.

```python
if robot.lift.has_adapter:
    if not robot.lift.get_height().homed:
        robot.lift.move_home(wait_timeout=30).wait(timeout=35)

    op = robot.lift.move_height(0.20, tolerance=0.005, wait_timeout=20)
    snap = op.get(timeout=1.0)
    print(snap.state, snap.feedback.progress if snap.feedback else None)
    outcome = op.wait(timeout=25)
    print(outcome.success, outcome.status_message)
```

`move_height` returns an Operation: `get()` pulls one snapshot, `wait()` blocks for the terminal state, `cancel()` makes a best-effort cancel. See [Commands and long-running operations](../../usage/basics/commands-operations.md). `has_adapter` only says the slot has an adapter bound.

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
Each `servo_height()` call sends one target. You must call `stop()` when you are done; a dropped connection does not guarantee the lift stops. See [Servo and safety](../../usage/basics/concurrency-and-safety.md).
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
| Move command rejected | CAN link down, e-stop asserted, or target outside the stroke | Check `status()` and `fault_code`; position commands enable the drive themselves, so no prior `set_enable` is needed |
| Absolute target rejected | `require_homed` is on and `homed` is `False` | Run `move_home()`, or `set_height_zero()` at a known mechanical position |
| Homing or arrival times out | The server-side budget is still `default_wait_timeout_s` | Pass seconds to the command's own `wait_timeout`; the client `wait(timeout=...)` does not extend the motion |
| `move_height` stays `Queued` | Another Operation owns the resource | Wait for it, or `cancel()` it |
| Every height reading shifted | Someone called `set_height_zero()` | Re-home and confirm the zero definition |
