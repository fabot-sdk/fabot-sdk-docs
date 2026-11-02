---
title: Teleop
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Teleop

Start and stop joystick teleop sessions. The long-running task model is in [Commands & Operations](../../usage/commands-operations.md), the API in [Teleop](../../reference/python/teleop.md).

## Start a joystick session

`start_joystick_control` returns a long-running Operation: the session keeps receiving remote control data, progress snapshots come from `events()`, and the result is readable once terminal. Cancelling the Operation is equivalent to ending the session.

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["teleop"])

    op = robot.teleop.start_joystick_control()
    print("session id:", op.id)

    for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
        print(snap.state, snap.feedback)
        if snap.terminal:
            break

    print(snap.state is OperationState.Succeeded, snap.result)
```

Notes:

- The session has a 45-second default budget and ends automatically when it expires.
- The `joystick_control` resource uses policy `reject`: calling `start_joystick_control()` during a session is refused immediately (`ResourceConflict`) rather than queued.

## Cancel a session

```python
op = robot.teleop.start_joystick_control()
# ... joystick operation ...
snap = op.cancel()
print(snap.state)          # OperationState.Canceled
```

`cancel()` is best effort: if the session already ended naturally, the returned snapshot is `Succeeded` or another terminal state.

## Stop explicitly

`stop_joystick_control()` is a short command returning an `Outcome`:

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.status_message)
```
