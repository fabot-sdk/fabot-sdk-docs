---
title: E-Stop
status: draft
owner: fabot-core
updated: 2026-11-02
---

# E-Stop

Subscribe to robot-wide e-stop and fault events, and walk through engaging and releasing the e-stop. The event model is in [Events & Data Channels](../../usage/events-channels.md), faults and lifecycle in [Status, Faults & Lifecycle](../../usage/status-faults.md), and the API in [Robot](../../reference/python/robot.md).

## Subscribe to e-stop and fault events

`robot.events.estop_changed` pushes latch changes (`EstopChangedEvent.estop` is an `EstopState`) and `robot.events.faults_changed` pushes robot-wide fault changes. Both are robot events, subscribable as soon as the connection is up without waiting for `wait_ready()`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs.

```python
from fabot import Robot
from fabot.core import EstopChangedEvent, FaultsChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(event):          # event: EstopChangedEvent
        state = event.estop
        print("estop:", state.asserted, state.reason, state.source_id)

    def on_faults(event):         # event: FaultsChangedEvent
        print("faults:", event.faults.revision)

    estop_token = robot.events.estop_changed.subscribe(on_estop)
    faults_token = robot.events.faults_changed.subscribe(on_faults)
    # ...
    estop_token.close()
    faults_token.close()
```

For the undecoded raw bus event, use a wildcard subscription with `matches()` / `from_event()`:

```python
def on_event(event):
    decoded = EstopChangedEvent.try_from_event(event)   # None on mismatch
    if decoded is not None:
        print(decoded.estop.asserted)

token = robot.events.subscribe(on_event, name="fabot.estop.changed")
```

## Engage and release

`robot.estop.engage()` latches the robot-wide e-stop so `robot.state().mode` becomes `RobotMode.Estopped`; `release()` clears it. Both return the latest `EstopState`.

```python
state = robot.estop.engage(reason="manual test", source="app")
print(state.asserted, state.reason)

print(robot.state().mode, robot.state().is_estopped)

state = robot.estop.release(reason="test done", source="app")
print(state.asserted)
```

## Recovery checks

After releasing, verify three things: the mode has left `Estopped`, the health, and the faults recorded during the stop.

```python
import time

robot.estop.release(reason="site check done")

for _ in range(50):
    st = robot.state()
    if not st.is_estopped:
        break
    time.sleep(0.1)

if st.is_estopped:
    print("still e-stopped:", hex(st.root_causes[0].code) if st.root_causes else st.mode)

print("health:", st.health)
for record in robot.faults().chassis.records:
    print("leftover fault:", hex(record.code), record.severity)

print(robot.chassis.lifecycle())
```

Note: run mode and health are independent axes. An e-stop only changes `mode`, while `health` stays driven by faults and power-on self-test, so "e-stopped but healthy" is legal. The full checklist is in [Troubleshooting](../../troubleshooting.md).
