---
title: Power
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Power

Read battery level and charging state from both power slots, and subscribe to fault and lifecycle events. The power capability has no Commands / Operations and no data channels — only read-only queries and events; see [Events & Channels](../../usage/events-channels.md) for the event model, [Status, Faults & Lifecycle](../../usage/status-faults.md) for faults and lifecycle, and [Power](../../reference/python/power.md) for the API and fields.

## Read Battery and Charging State

`robot.power_1` / `robot.power_2` are two independent power slots. `status()` returns a `Status` snapshot: `energy` (battery level) / `voltage` / `current` / `temperature` / `is_charging`.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1", "power_2"])

    for slot in (robot.power_1, robot.power_2):
        st = slot.status()
        print(
            slot.slot_id,
            "energy:", st.energy,
            "voltage:", st.voltage,
            "current:", st.current,
            "temperature:", st.temperature,
            "charging:", st.is_charging,
        )
        if st.energy < 20 and not st.is_charging:
            print(slot.slot_id, "battery low, please charge soon")
```

Notes:

- `status()` takes no arguments and returns the current snapshot immediately; poll it yourself for continuous monitoring — power has no data channel.
- The two slots are independent: a low `power_1` says nothing about `power_2`; check them separately.

## Query Health and Faults

`health()` / `lifecycle()` are common read-only queries; `faults()` returns `Faults`. Power currently has no named faults, only the `revision` counter.

```python
snap = robot.power_1.lifecycle()
print("lifecycle:", snap.lifecycle, "health:", snap.health)

faults = robot.power_1.faults()
print("fault revision:", faults.revision)
```

## Subscribe to Fault and Lifecycle Events

`fault_changed` fires when the fault set changes, `lifecycle_changed` when lifecycle or health changes. Callbacks run on the SDK I/O thread: keep them lightweight and never call blocking APIs from them.

```python
from fabot import Robot
from fabot.core.event_types import LifecycleChangedEvent
from fabot.capabilities.power import FaultChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["power_1"])

    def on_fault(event: FaultChangedEvent):
        print(event.header.slot_id, "fault changed, revision =", event.faults.revision)

    def on_lifecycle(event: LifecycleChangedEvent):
        snap = event.lifecycle
        print(event.header.slot_id, "lifecycle =", snap.lifecycle, "health =", snap.health)

    robot.power_1.events.fault_changed.subscribe(on_fault)
    robot.power_1.events.lifecycle_changed.subscribe(on_lifecycle)
    input("press Enter to exit...\n")
```

When the `with` block exits, `robot.close()` closes all subscriptions at once — no per-`token.close()` calls needed.

## See Also

- [Events & Channels](../../usage/events-channels.md)
- [Status, Faults & Lifecycle](../../usage/status-faults.md)
- [Power API Reference](../../reference/python/power.md)
