---
title: Events & Data Channels
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Events & Data Channels

The SDK provides two mechanisms for passively receiving data: **Events** are discrete semantic messages (e-stop triggers, fault changes, lifecycle transitions, etc.), and **data Channels** are streams continuously pushed by a capability (joint positions, camera images, IO level changes, etc.) with QoS levels. Rule of thumb: subscribe to events for state transitions, open a channel for high-frequency telemetry.

## Event Subscription

Events come from three levels; all subscription entries look the same and return a `SubscriptionToken`:

| Level | Entry | Content |
|-------|-------|---------|
| Whole robot | `robot.events` | Platform events: e-stop, robot run state, slot registry, configuration, service state, robot-wide faults |
| Capability | `robot.<slot>.events` | Events of one slot: `fault_changed` / `lifecycle_changed` |
| Logs | `robot.logs` | Structured log record stream from the platform and capabilities |

### Subscribing and Unsubscribing

```python
from fabot import Robot

def on_estop(event):  # event: EstopChangedEvent
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

with Robot.connect("192.168.1.10", 7557) as robot:
    token = robot.events.estop_changed.subscribe(on_estop)
    # ...
    token.close()  # unsubscribe; robot.close() closes all subscriptions
```

- Each typed entry (e.g. `robot.events.estop_changed`) pushes exactly one event type; the callback receives the decoded event object.
- `subscribe(callback, on_error=...)`: `on_error` receives delivery-time errors (such as payload decode failures) as a `FabotError`; if omitted, such errors are raised on the callback thread.
- `SubscriptionToken`: call `token.close()` to unsubscribe (idempotent), `token.is_active` to check whether it is still active; it also works as a `with` context manager. `robot.close()` closes all subscriptions.

### Event Objects and EventHeader

Every event carries an `EventHeader` with metadata: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`. Typed events add one semantic payload field next to `header` (e.g. `EstopChangedEvent.estop`, an `EstopState`); field details are documented in [Robot Entry](../reference/python/robot.md).

### Subscribing to All Events (Raw Events)

`robot.events.subscribe(callback)` subscribes to every event on the bus (whole-robot and capability alike); `robot.<slot>.events.subscribe(callback)` subscribes to every event of one slot. The callback receives the undecoded raw `Event`; use each event type's `matches()` / `from_event()` (or `try_from_event()`, which returns `None` on mismatch) to discriminate and decode:

```python
from fabot.core import EstopChangedEvent

def on_event(event):  # event: Event (raw bus event)
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        print("estop:", e.estop.asserted, e.estop.reason)

token = robot.events.subscribe(on_event)
```

### Whole-Robot Event Reference

| Entry | Event type | Payload field |
|-------|-----------|---------------|
| `robot.events.estop_changed` | `EstopChangedEvent` | `estop`: `EstopState` (`asserted` / `reason` / `source_id` etc.) |
| `robot.events.robot_state_changed` | `RobotStateChangedEvent` | `robot_state`: `RobotState` |
| `robot.events.registry_changed` | `RegistryChangedEvent` | `registry`: `RegistryEvent` (`registry_revision` / `capability_id`) |
| `robot.events.config_changed` | `ConfigChangedEvent` | `config`: `ConfigState` |
| `robot.events.service_state_changed` | `ServiceStateChangedEvent` | `service_state`: `ServiceState` |
| `robot.events.faults_changed` | `FaultsChangedEvent` | `faults`: `RobotFaults` (aggregated faults of all slots) |

Payload field definitions are documented in the events / status sections of [Robot Entry](../reference/python/robot.md); the state and fault model is covered in [Status, Faults & Lifecycle](status-faults.md).

### Capability Events

All 15 capability modules expose the same event entries:

- `robot.<slot>.events.fault_changed`: the slot's fault set changed; payload is the module's `Faults` (currently every module's `Faults` has only `revision` — no named faults yet).
- `robot.<slot>.events.lifecycle_changed`: the slot's lifecycle or health changed; payload is a `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`).

Each module's events are defined in the API reference, e.g. [Arm](../reference/python/arm.md).

### Log Stream

`robot.logs.subscribe(callback, min_level=..., slot=...)` subscribes to structured logs:

```python
from fabot.core import LogLevel

def on_log(record):  # record: LogRecord
    print(record.level, record.component, record.message)

token = robot.logs.subscribe(on_log, min_level=LogLevel.Warn, slot="chassis")
```

- `min_level`: `LogLevel.Debug` / `Info` / `Warn` / `Error`, default `Info`; when `slot` is given, only that slot's logs are delivered.
- Main `LogRecord` fields: `ts_us` / `level` / `component` / `action` / `message` / `trace_id` / `capability_id`, etc. For human-readable text use `Catalogs.format_log`; see [Localized Text (Catalogs)](catalogs.md).

:::warning Callback thread constraint
Event and log callbacks run on the SDK's I/O thread: keep them lightweight and return quickly. Never call any blocking API inside a callback (connection factory methods, Commands, `frames()` iteration, etc. raise `ClientThreadError`), and do not start new subscriptions from the callback thread either. For heavy processing, hand the work off to your own queue or thread.
:::

## Data Channels

Capabilities that provide data channels expose typed channel entries. Calling one opens the channel and returns a Channel handle; iterate frames with `frames()`:

```python
ch = robot.io.digital_events(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload)
finally:
    ch.close()
```

- Frames uniformly have four fields: `channel_id` / `sequence` / `timestamp_us` / `payload`, where `payload` is the channel's typed data (see each module's reference page).
- `frames(poll_timeout_ms=..., timeout_ms=...)` returns a frame iterator: `poll_timeout_ms` is the per-fetch wait limit (default 1000; on expiry the loop moves to the next round), `timeout_ms` is the overall deadline and raises the built-in `TimeoutError` when reached; `timeout_ms=None` (default) means no limit. When iteration stops (`break` / exception), frame fetching stops automatically, but the channel itself stays open — release it with `ch.close()`.
- Channels are **leases**: SDK background threads renew them automatically (thread count is controlled by `ClientOptions.channel_renew_threads`, see [Connection & Robot Entry](connection.md)); `ch.renew()` forces one immediate renewal. `robot.close()` closes all channels.
- Opening a channel, `frames()`, `renew()`, and `close()` are all blocking calls and must not run on the event callback thread (they raise `ClientThreadError`).

### Channels per Capability

| Capability (slot) | Channels |
|-------------------|----------|
| arm (`left_arm` / `right_arm`) | `joints()` / `pose()` |
| arms (`arms`) | `joints()` / `pose()` |
| body (`body`) | `joints()` |
| hand (`left_hand` / `right_hand`) | `joints()` |
| gripper (`left_gripper` / `right_gripper`) | `joints()` |
| head (`head`) | `joints()` |
| motion (`motion`) | `joints()` |
| io (`io`) | `digital_events()` |
| camera (`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`) | `frameset()` / `color()` / `depth()` / `rtsp()` / `webrtc()` |
| voice (`voice`) | `wake()` / `transcript()` / `intent()` |

Per-channel payload types and details are documented on each module's reference page ([Python API Reference](../reference/python/index.md)). Note that camera `rtsp()` / `webrtc()` return preview playback URLs (`StreamUrlT`) rather than frame iteration.

### QoS Levels

`qos_profile` is a string with three levels when opening a channel (all current channels default to `"latest"`):

| Value | Semantics |
|-------|-----------|
| `"latest"` | Keep only the newest frame; older frames are dropped when consumption lags |
| `"realtime"` | Lowest latency; frames may be dropped |
| `"reliable"` | Best-effort delivery |

Any other value raises `ValueError`.

## Event Type Reference

Platform event types are defined in `fabot.core`: `EstopChangedEvent`, `RobotStateChangedEvent`, `RegistryChangedEvent`, `ConfigChangedEvent`, `ServiceStateChangedEvent`, `FaultChangedEvent`, `FaultsChangedEvent`, `LifecycleChangedEvent`, `ManagerConnectionChangedEvent`. Each capability module's `events` also provides a `FaultChangedEvent` bound to that module's `Faults` type. All of them offer `matches()` / `from_event()` / `try_from_event()`.

## Related

- Polling status and faults: [Status, Faults & Lifecycle](status-faults.md)
- Error types such as `FabotError` / `ClientThreadError`: [Error Handling](errors.md)
- Per-module channel and event details: [Python API Reference](../reference/python/index.md)
