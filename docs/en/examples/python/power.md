---
title: Power
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Power

Read energy and charging state from both power rails, and subscribe to fault and lifecycle events. Power has no Commands, Operations or data channels, only read-only queries and events; the event model is in [Events & Data Channels](../../usage/events-channels.md), faults and lifecycle in [Status, Faults & Lifecycle](../../usage/status-faults.md), and the API in [Power](../../reference/python/power.md).

## Read energy and charging state

`robot.power_1` / `robot.power_2` are two independent power slots. `status()` returns a `Status` snapshot: `energy` / `voltage` / `current` / `temperature` / `is_charging`.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1", "power_2"])

    for rail in (robot.power_1, robot.power_2):
        st = rail.status()
        print(rail.id, st.energy, st.voltage, st.current, st.temperature, st.is_charging)
```

## Read both rails from the robot-wide bags

`robot.status()` aggregates every capability that provides `status()`:

```python
agg = robot.status()
print(agg.generation, agg.revision)
print(agg.power_1.energy, agg.power_2.energy)
print(agg.head_camera.state, agg.screen.activity)
```

## Watch for low battery

Power has no event stream, so poll it yourself — from your own thread or timer, never inside a callback:

```python
import threading
import time

def watch(robot, threshold=20, interval=5.0):
    while True:
        if robot.power_1.status().energy < threshold:
            robot.logs.warn("battery low", component="app", slot="power_1")
        time.sleep(interval)

threading.Thread(target=watch, args=(robot,), daemon=True).start()
```

Custom logs from `robot.logs.warn(...)` join the same log stream, see [Logs, Metrics & Observability](../../usage/observability.md).

## Subscribe to faults and lifecycle

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health, snap.pbit_completed)

token = robot.power_1.events.lifecycle_changed.subscribe(on_lifecycle)
```
