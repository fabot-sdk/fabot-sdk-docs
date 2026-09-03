---
title: Navigation
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Navigation

Run a navigation task and track progress. See [Commands & Operations](../../usage/commands-operations.md) for the long-running task model and [Chassis](../../reference/python/chassis.md) for the API.

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    op = robot.chassis.navigate_to_station(station_id="charging")
    for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
        print("state:", snap.state, "progress:", snap.feedback)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("Arrived:", snap.result)
    else:
        print("Failed:", snap.error)
```
