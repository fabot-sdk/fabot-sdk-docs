---
title: E-Stop
status: draft
owner: fabot-core
updated: 2026-09-03
---

# E-Stop

Subscribe to e-stop and fault events. See [Events & Data Channels](../../usage/events-channels.md) for the event model and [Status, Faults & Lifecycle](../../usage/status-faults.md) for faults.

```python
from fabot import Robot
from fabot.core.event_types import EstopChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(e: EstopChangedEvent):
        print("E-stop state changed:", e)

    token = robot.events.estop_changed.subscribe(on_estop)
    robot.wait_ready()
    input("Press Enter to exit...\n")
```
