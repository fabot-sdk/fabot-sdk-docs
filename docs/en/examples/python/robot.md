---
title: E-Stop
status: draft
owner: fabot-core
updated: 2026-09-04
---

# E-Stop

Subscribe to whole-robot e-stop and fault events, and walk through the full engage / release flow. See [Events & Data Channels](../../usage/events-channels.md) for the event model, [Status, Faults & Lifecycle](../../usage/status-faults.md) for faults and lifecycle, and [Robot](../../reference/python/robot.md) for the API and fields.

## Subscribing to E-Stop and Fault Events

`robot.events.estop_changed` pushes e-stop latch changes (`EstopChangedEvent.estop` is an `EstopState` snapshot); `robot.events.faults_changed` pushes changes to the aggregated whole-robot faults. Both are whole-robot events and can be subscribed as soon as the connection is up — no `wait_ready()` for capability slots is needed. Callbacks run on the SDK I/O thread: keep them light and never call blocking APIs inside.

```python
from fabot import Robot
from fabot.core.event_types import EstopChangedEvent, FaultsChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(e: EstopChangedEvent):
        s = e.estop
        print("E-stop changed: asserted =", s.asserted, "reason =", s.reason, "source =", s.source_id)

    def on_faults(e: FaultsChangedEvent):
        for f in e.faults.faults:
            print("Fault:", f.capability_id, f.fault_id, f.fault_class)

    robot.events.estop_changed.subscribe(on_estop)
    robot.events.faults_changed.subscribe(on_faults)
    input("Press Enter to exit...\n")
```

When the `with` block exits, `robot.close()` closes all subscriptions at once — no per-`token.close()` needed. `EstopState.reason` / `source_id` record why and by what the e-stop was triggered, so you can tell whether it came from an SDK call.

## Engage, Release, and Recovery

`robot.estop` provides `engage` / `release` / `state`; all three return the latest `EstopState` snapshot. `engage` latches the whole-robot e-stop and the robot run state becomes `RobotRunState.Estopped`. Recovery: after confirming the scene is safe, call `release`, then check `robot.state()` to confirm the robot has left the e-stopped state, and inspect `robot.faults()` for faults recorded while e-stopped.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    state = robot.estop.engage(reason="safety check", source="demo")
    print("E-stop engaged:", state.asserted, "| reason:", state.reason)

    input("Press Enter to release after confirming the scene is safe...\n")

    state = robot.estop.release(reason="check done", source="demo")
    print("E-stop released:", not state.asserted)

    if robot.state().is_estopped:
        print("Robot still Estopped:", robot.state().reasons)

    faults = robot.faults()
    print("Faults revision:", faults.revision)
```

Note: `robot.faults()` returns `RobotFaults` organized per slot (`revision` plus 22 slot fault bags; fields in [Robot](../../reference/python/robot.md)), while the `faults_changed` event carries `faults` as a list of fault records (`RobotFaultSnapshot`) — the two shapes differ.
