---
title: Teleop
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Teleop

Start and stop joystick teleoperation sessions. See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model and [Teleop](../../reference/python/teleop.md) for the API.

## Start a Joystick Control Session

`start_joystick_control` returns a long-running Operation: while the session is active it keeps receiving remote control data. Poll progress snapshots via `events()` and read the result once a terminal state is reached. Cancelling the Operation is equivalent to ending the session.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["teleop"])

    op = robot.teleop.start_joystick_control()
    for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
        if snap.feedback is not None:
            print("progress:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("Session ended normally:", snap.result.statusMessage)
    else:
        print("Session ended abnormally:", snap.error)
```

Notes:

- The snapshot's `feedback` is a `ProgressT` (`progress` / `statusMessage`) and may be `None` right after the session starts.
- The terminal snapshot's `result` is an `OutcomeT` (`success` / `statusMessage`); read `error` for the failure reason — see [Error Handling](../../usage/errors.md).
- Sessions have a default time limit and reach a terminal state automatically when it expires. Teleop is an exclusive resource: only one session is allowed at a time — see [Teleop](../../reference/python/teleop.md).

## Stop the Teleop Session

To end the session actively, call `stop_joystick_control`. It is a Command that returns the outcome directly:

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.statusMessage)
```

Notes:

- Calling `start_joystick_control` again while a session is active is rejected outright (no queuing); call `stop_joystick_control` first or wait for the session to end.
- If you hold the Operation handle, `op.cancel()` also ends the session; the returned terminal snapshot has `state == OperationState.Canceled`.
- This module has no data channels; subscribe to `robot.teleop.events.lifecycle_changed` for lifecycle changes — see [Events & Channels](../../usage/events-channels.md).
