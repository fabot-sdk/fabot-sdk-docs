---
title: Events & Data Channels
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Events & Data Channels

The SDK offers two mechanisms for receiving data passively: **events**, discrete semantic messages (e-stop engaged, faults changed, session state switched), and **data channels**, continuous capability streams (joint positions, camera images) with QoS profiles. Rule of thumb: subscribe to events for state transitions, open channels for high-rate telemetry.

## Event subscription

Events come in three layers, all returning a `SubscriptionToken`:

| Layer | Entry | Content |
|-------|-------|---------|
| Robot | `robot.events` | Platform events: e-stop, robot state, registry, config, service state, robot-wide faults |
| Capability | `robot.<slot>.events` | Per-slot events: `fault_changed` / `lifecycle_changed`, plus camera and voice specifics |
| Logs / metrics | `robot.logs` / `robot.metrics` | Log and metric streams, see [Logs, Metrics & Observability](observability.md) |

### Subscribing and unsubscribing

```python
from fabot import Robot

def on_estop(event):  # event: EstopChangedEvent
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

with Robot.connect("192.168.1.10", 7557) as robot:
    token = robot.events.estop_changed.subscribe(on_estop)
    # ...
    token.close()  # unsubscribe; robot.close() closes every subscription
```

- Every typed entry (such as `robot.events.estop_changed`) pushes exactly one event type, and the callback receives a decoded event object.
- `subscribe(callback, on_error=...)`: `on_error` receives delivery errors (for example a failed payload decode, passed as a `FabotError`); without it the error is raised on the callback thread.
- `SubscriptionToken`: `token.close()` unsubscribes (idempotent), `token.is_active` reports whether it is still live, and it works as a `with` context manager. `robot.close()` closes all subscriptions.

### Event objects and EventHeader

Every event carries `EventHeader` metadata: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`. Typed events add one semantic payload field beside `header` (for example `EstopChangedEvent.estop` is an `EstopState`); field details are in [Robot Entry](../reference/python/robot.md).

### Subscribing to all events

`robot.events.subscribe(callback)` subscribes to everything on the bus and can narrow by `name` / `slot`; `robot.<slot>.events.subscribe(callback)` subscribes to one slot. The callback receives the undecoded `Event`; use the event type's `matches()` / `from_event()` (or `try_from_event()`, which returns `None` on mismatch):

```python
from fabot.core import EstopChangedEvent

def on_event(event):  # event: Event (raw bus event)
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        print("estop:", e.estop.asserted, e.estop.reason)

token = robot.events.subscribe(on_event, name="fabot.estop.changed")
```

### Emitting custom events

`robot.events.emit(...)` publishes a custom event on the bus; pass an `Event` or a name plus payload.

```python
robot.events.emit(
    "app.job.finished",
    code=0,
    attrs=[("job", "pick-42")],
    duration_ms=1200,
)
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `event_or_name` | `Event \| str` | (required) | Event object or name |
| `payload` | any | `None` | Event payload |
| `level` | `LogLevel` | `Info` | Event level |
| `attrs` | sequence of pairs | `None` | Extra attributes |
| `slot` / `capability_id` | `str` | `""` | Owning slot and capability |
| `code` / `duration_ms` | `int` | `0` | Diagnostic code and duration in ms |
| `trace_id` / `ts_us` | `str` / `int` | `""` / `0` | Trace id and timestamp; `0` lets the SDK fill it |

### Robot-wide events

| Entry | Event type | Payload field |
|-------|------------|---------------|
| `robot.events.estop_changed` | `EstopChangedEvent` | `estop`: `EstopState` (`asserted` / `reason` / `source_id`, …) |
| `robot.events.robot_state_changed` | `RobotStateChangedEvent` | `robot_state`: `RobotState` |
| `robot.events.registry_changed` | `RegistryChangedEvent` | `registry`: `RegistryEvent` (`registry_revision` / `capability_id`) |
| `robot.events.config_changed` | `ConfigChangedEvent` | `config`: `ConfigState` |
| `robot.events.service_state_changed` | `ServiceStateChangedEvent` | `service_state`: `ServiceState` |
| `robot.events.faults_changed` | `FaultsChangedEvent` | `faults`: `RobotFaults` (fault bags per slot) |

Payload fields are documented in the events / state sections of [Robot Entry](../reference/python/robot.md); the status and fault model is in [Status, Faults & Lifecycle](status-faults.md).

### Capability events

All 15 capability modules provide two events:

- `robot.<slot>.events.fault_changed`: this slot's fault set changed; payload is that module's `Faults` (`revision` plus `records`).
- `robot.<slot>.events.lifecycle_changed`: lifecycle or health changed; payload is a `CapabilityLifecycleSnapshot`.

Three modules add specific events:

| Event | Payload | Description |
|-------|---------|-------------|
| `robot.<camera>.events.camera_session_changed` | `SessionState` | Session state change (streaming, sync, registration, calibration generation) |
| `robot.<camera>.events.camera_calibration_changed` | `CameraCalibration` | Calibration updated; re-read intrinsics and extrinsics |
| `robot.<camera>.events.camera_device_connection_changed` | `DeviceConnectionEvent` | Device connected or disconnected |
| `robot.voice.events.audio_wake_word_detected` | `WakeEvent` | Wake word fired (`keyword` / `timestamp_us`) |

Per-module event definitions are in the matching reference page, for example [Camera](../reference/python/camera.md).

### Log streams

Log and metric streams have their own entries and query APIs, see [Logs, Metrics & Observability](observability.md).

:::warning Callback thread constraints
Event, log and channel callbacks all run on the SDK I/O thread: keep them short and return quickly. Never call blocking APIs inside a callback (connection factories, Commands, `frames()` iteration — all raise `ClientThreadError`), and do not start new subscriptions from a callback. Hand heavy work to your own queue or thread.
:::

## Data channels

Capabilities that support data channels generate typed channel entries; calling one opens the channel and returns a handle that you iterate with `frames()`:

```python
ch = robot.left_arm.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload.positions)
finally:
    ch.close()
```

- Every frame has four fields: `channel_id` / `sequence` / `timestamp_us` / `payload`, where `payload` is the typed data for that channel (see each module page).
- `frames(poll_timeout_ms=1000, timeout_ms=None)` returns a frame iterator: `poll_timeout_ms` is the per-iteration wait and `timeout_ms` the overall limit, after which `Timeout` is raised; `timeout_ms=None` (the default) means no limit. Breaking out of the loop stops iteration but the channel stays open, so call `ch.close()`.
- `next(timeout=5.0)` returns the next frame's `payload` directly, convenient for one-shot reads.
- A channel is a **lease**: a background thread renews it (worker count from `ClientOptions.channel_renew_threads`, see [Connection & Robot Entry](connection.md)), and `ch.renew()` renews immediately. `robot.close()` closes every channel.
- Opening a channel, `frames()`, `next()`, `renew()` and `close()` are all blocking and must not run on the callback thread (`ClientThreadError`).
- The handle also exposes `id` and `descriptor` (`ChannelDescriptor`: `channel_id` / `stream_schema` / `qos` / `lease_ttl_ms`) and works as a `with` context manager.

### Channels per capability

| Capability (slots) | Channels |
|--------------------|----------|
| arm (`left_arm` / `right_arm`) | `joint()` / `pose()` / `wrench()` / `filtered_wrench()` |
| arms (`arms`) | `joint()` / `pose()` |
| body (`body`) | `joint()` / `pose()` |
| hand (`left_hand` / `right_hand`) | `opening()` / `joint()` / `tactile()` |
| gripper (`left_gripper` / `right_gripper`) | `opening()` / `joint()` |
| head (`head`) | `joint()` / `pose()` |
| motion (`motion`) | `joint()` / `wbc_state()` / `center_of_mass()` |
| chassis (`chassis`) | `pose()` / `twist()` / `stage()` |
| camera (5 camera slots) | `frameset()` / `color()` / `depth()` / `registered_depth()` / `infrared()` / `infrared_left()` / `infrared_right()` / `confidence()` / `points()` / `imu()` / `rtsp()` / `webrtc()` |
| voice (`voice`) | `wake()` / `capture()` / `playback()` |
| skills.camera_sync | `sync_groups()` / `synced_frames()` |

Payload types and per-channel notes are in each module page ([Python API Reference](../reference/python/index.md)). Note that the camera `rtsp()` / `webrtc()` channels publish media endpoint descriptors (`MediaEndpoint`) rather than frames.

### QoS profiles

`qos_profile` is a string with three values (all channels currently default to `"latest"`):

| Value | Semantics |
|-------|-----------|
| `"latest"` | Keep only the newest frame; drop old ones when the consumer lags |
| `"realtime"` | Lowest latency, frame loss allowed |
| `"reliable"` | Best-effort delivery |

Any other value raises `ValueError`.

## Event type index

Platform event types live in `fabot.core`: `EstopChangedEvent`, `RobotStateChangedEvent`, `RegistryChangedEvent`, `ConfigChangedEvent`, `ServiceStateChangedEvent`, `FaultChangedEvent`, `FaultsChangedEvent`, `LifecycleChangedEvent`, `ManagerConnectionChangedEvent`. Each capability module's `events` also has a `FaultChangedEvent` bound to that module's `Faults` type. All provide `matches()` / `from_event()` / `try_from_event()`.

`robot.events.FaultsChangedEvent` (imported from `fabot.robot`) is the product-layer variant of the same event: its payload is a typed `RobotFaults` rather than a flat `RobotFaultSnapshot`.

## Related

- Active status and fault queries: [Status, Faults & Lifecycle](status-faults.md)
- Logs and metrics: [Logs, Metrics & Observability](observability.md)
- Error types such as `FabotError` / `ClientThreadError`: [Error Handling](errors.md)
- Per-module channels and events: [Python API Reference](../reference/python/index.md)
