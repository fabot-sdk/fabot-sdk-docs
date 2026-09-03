---
title: Events & Data Channels
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Events & Data Channels

The SDK provides two mechanisms for passively receiving data: **Events** are discrete semantic messages (fault changes, e-stop triggers, etc.), and **data Channels** are streams continuously pushed by a capability (IO levels, joint positions, etc.) with QoS.

## Event Subscription

Events come from three levels; all subscriptions return a `SubscriptionToken` (use the return value or pair it with an explicit unsubscribe):

| Level | Entry | Typical events |
|-------|-------|----------------|
| Whole robot | `robot.events` | `estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed` |
| Capability | `robot.<slot>.events` | `fault_changed` / `lifecycle_changed` (see each module's docs) |
| Logs | `robot.logs` | Platform/capability log record stream |

```python
# Subscribe to one event type (typed stream)
token = robot.events.estop_changed.subscribe(on_estop, on_error=on_err)

# Subscribe to all whole-robot events and discriminate types yourself
def on_event(event):
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        ...
token_all = robot.events.subscribe(on_event)

# Log stream
robot.logs.subscribe(on_log, min_level=LogLevel.WARN, slot="chassis")
```

!!! warning "Callback thread constraint"
    Callbacks run on the SDK's I/O thread: keep them lightweight and never call blocking APIs inside a callback (raises `ClientThreadError`). For heavy processing, hand the work off to your own queue/thread.

## Data Channels

Capabilities that provide data channels get typed channel entries. Iterate with `frames()`.

```python
ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)

for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload)
```

## QoS

`QosProfile` has three levels: `Realtime` (lowest latency, frames may be dropped) / `Latest` (keep only the newest) / `Reliable` (best-effort delivery). Defaults are documented per module and can be overridden per call.

## Event Type Reference

Platform event types (`fabot.core.event_types`): `EstopChangedEvent`, `RobotStateChangedEvent`, `RegistryChangedEvent`, `ConfigChangedEvent`, `ServiceStateChangedEvent`, `FaultChangedEvent`, `FaultsChangedEvent`, `LifecycleChangedEvent`, `ManagerConnectionChangedEvent`.
