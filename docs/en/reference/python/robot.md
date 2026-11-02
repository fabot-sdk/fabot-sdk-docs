---
title: Robot Entry
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Robot Entry

`Robot` is the single Python SDK entry point: it connects, exposes capability proxies per slot, aggregates the robot-wide e-stop / state / faults, and provides entries for logs, metrics, events, coordinate frames, configuration, services and skills. Connection lifecycle and options are covered in [Connection & Robot Entry](../../usage/connection.md).

## connect

`connect` / `from_endpoint` / `from_config` establish a connection; `close()` or the `with` block closes it.

```python
Robot.connect(host: str | None = None, port: int = 7557, options: ClientOptions | None = None, *, config: ClientConfig | None = None, wait_ready: bool = False) -> Robot
Robot.from_endpoint(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_config(config: ClientConfig | None = None, options: ClientOptions | None = None) -> Robot
Robot.from_backend(backend, options: ClientOptions | None = None) -> Robot
Robot.mock() -> MockRobot
robot.close() -> None
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `host` | `str \| None` | `None` | Control-plane host; `None` uses the configured default discovery |
| `port` | `int` | `7557` | Control-plane port |
| `options` | `ClientOptions` | `None` | Timeouts and caches, see below |
| `config` | `ClientConfig` | `None` | Client identity and transport, see below; mutually exclusive with `host` |
| `wait_ready` | `bool` | `False` | When `True`, calls `wait_ready()` before returning |

Passing both `host` and `config` raises `TypeError`. `from_endpoint` is the explicit-endpoint spelling; `from_backend` plugs in a custom transport backend (advanced); `mock()` returns a `MockRobot` needing no robot, see [Mock Testing](../../usage/mock.md).

`ClientConfig` (identity and transport):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `client_id` | `str` | `"fabot_sdk"` | Client identifier |
| `zenoh_config_file` | `str` | `""` | Custom transport config file |
| `auth_token` | `bytes` | `b""` | Auth token |
| `max_control_message_bytes` | `int` | `1048576` | Control message ceiling in bytes |

`ClientOptions` (timeouts and caches):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resolve_timeout_ms` | `int` | `1000` | Slot resolution timeout in ms, also the per-slot `wait_ready` budget |
| `command_timeout_ms` | `int` | `3000` | Default Command timeout in ms |
| `resolve_cache_ttl_ms` | `int` | `30000` | Resolution cache lifetime in ms |
| `resolve_cache_capacity` | `int` | `256` | Resolution cache capacity |
| `completion_executor` | — | `None` | Executor for async completion callbacks |
| `channel_renew_threads` | `int` | `2` | Workers renewing channel leases (client-wide) |
| `preview_host` | `str` | `""` | Router host recorded by `from_endpoint`, used to rewrite loopback preview URIs |

Factories block until the connection is up and raise `FabotError` on failure; calling them (or `close()`) from an event callback (the SDK I/O thread) raises `ClientThreadError`. `close()` closes every subscription and the connection; the `with` block closes on exit.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.sdk_version, robot.version())
```

## wait_ready

`wait_ready(slots=None)` blocks until the given slots (all by default) are usable.

```python
wait_ready(slots: Sequence[str] | None = None) -> None
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `slots` | `Sequence[str]` | `None` | Slot ids to wait for; `None` means all 23 slots |

It reads the current slot configuration and blocks resolving each target slot that is **enabled, essential and has an adapter bound**. Unbound, disabled or non-essential slots are skipped. The per-slot budget comes from `ClientOptions.resolve_timeout_ms`, and a failed resolution raises.

```python
robot.wait_ready()                       # every bound slot
robot.wait_ready(["left_arm", "io"])     # only these slots
```

## slots

Capabilities are exposed as read-only properties, 23 in total; `robot.slots` returns all proxies as `dict[str, object]`.

| Slot property | Capability | Page |
|---------------|------------|------|
| `body` | `body` | [Body](body.md) |
| `left_arm` / `right_arm` | `arm` | [Arm](arm.md) |
| `left_hand` / `right_hand` | `hand` | [Hand](hand.md) |
| `left_gripper` / `right_gripper` | `gripper` | [Gripper](gripper.md) |
| `head` | `head` | [Head](head.md) |
| `chassis` | `chassis` | [Chassis](chassis.md) |
| `power_1` / `power_2` | `power` | [Power](power.md) |
| `io` | `io` | [IO](io.md) |
| `motion` | `motion` | [Motion](motion.md) |
| `teleop` | `teleop` | [Teleop](teleop.md) |
| `arms` | `arms` | [Arms](arms.md) |
| `head_camera` / `chest_camera` / `waist_camera` | `camera` | [Camera](camera.md) |
| `left_wrist_camera` / `right_wrist_camera` | `camera` | [Camera](camera.md) |
| `screen` | `screen` | [Screen](screen.md) |
| `light` | `light` | [Light](light.md) |
| `voice` | `voice` | [Voice](voice.md) |

Shared members of every slot proxy:

| Member | Description |
|--------|-------------|
| `slot_id` | Slot id |
| `handle` | Slot handle `SlotHandle` (resolved lazily; raises on failure) |
| `events` | Typed event entry for the slot |
| `health()` | Current health as `SlotHealth` |
| `lifecycle()` | `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`) |
| `faults()` | Current fault bag `Faults` |
| `ping(...)` | Runtime round-trip probe returning `PingReport` |
| `has_adapter` | Whether an adapter is bound (read-only property) |
| `as_adapter(adapter_type)` | Typed adapter view under `fabot.adapters` |
| `get_config()` / `set_config()` / `edit_config()` | Adapter config-domain access, see [Configuration](../../usage/configuration.md) |

Capability methods still get dispatched on a slot without an adapter (the platform then fails or times out), while `as_adapter()` and `get_config()` raise `AdapterUnbound` (a `NotFound`); check `has_adapter` first. `as_adapter` requires `adapter_type` to expose `ADAPTER_ID` (otherwise `TypeError`); an unbound slot raises `AdapterUnbound`, and a mismatched adapter raises `AdapterMismatch`.

```python
if robot.left_arm.has_adapter:
    print(robot.left_arm.get_joint().positions)

from fabot.adapters import Arm

arm = robot.left_arm.as_adapter(Arm)
```

## estop

`robot.estop` provides `engage` / `release` / `state`, all returning the latest `EstopState`; `is_asserted` is a shortcut for `state().asserted`.

```python
robot.estop.engage(reason: str = "", source: str = "") -> EstopState
robot.estop.release(reason: str = "", source: str = "") -> EstopState
robot.estop.state() -> EstopState
robot.estop.is_asserted -> bool
```

**Parameters** (`engage` / `release`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `reason` | `str` | `""` | Why the e-stop was engaged or released |
| `source` | `str` | `""` | Source identifier |

**`EstopState` fields**

| Field | Type | Description |
|-------|------|-------------|
| `asserted` | `bool` | Whether the e-stop is latched |
| `revision` | `int` | State revision |
| `asserted_at_us` / `cleared_at_us` | `int` | Last engage / release timestamps in microseconds |
| `reason` | `str` | Reason |
| `source_id` | `str` | Source id |

`engage` latches the robot-wide e-stop so `robot.state().mode` becomes `RobotMode.Estopped` (`robot.state().is_estopped` is `True`); `release` clears the latch. Changes are pushed through `robot.events.estop_changed`. Recovery: after confirming the site is safe call `release`, check `robot.state()`, and inspect `robot.faults()` for faults recorded while stopped.

```python
state = robot.estop.engage(reason="safety check")
print(state.asserted, state.reason)

robot.estop.release(reason="check done")
print(robot.estop.state().asserted)
```

## state / status / faults

Robot state comes in three layers: run state (`state()`), aggregated status bags (`status()`) and aggregated faults (`faults()`). All are active queries with no subscription interface; changes are events. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

| Method | Returns | Description |
|--------|---------|-------------|
| `state()` | `RobotState` | Run mode, health, root causes and per-domain health |
| `status()` | `RobotStatus` | Aggregated capability status bags |
| `faults()` | `RobotFaults` | Current faults aggregated per slot |
| `version()` | `str` | Robot platform version |
| `sdk_version` | `str` | SDK version (property) |

`RobotState`:

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `RobotMode` | `Unknown` / `Idle` / `Running` / `Estopped` |
| `health` | `HealthState` | `Unknown` / `Normal` / `Degraded` / `Fault` / `Fatal` |
| `root_causes` | `list[DiagnosticReason]` | Structured causes when health is not `Normal`; empty otherwise |
| `domains` | `list[DomainHealth]` | Per-domain health and reasons, sorted by domain key |
| `revision` | `int` | State revision |
| `timestamp_us` | `int` | Time of the last state or root-cause change (µs) |
| `source_instance_id` | `str` | Source instance id |

Convenience properties: `is_running` / `is_idle` / `is_estopped` (from `mode`), `is_normal` / `is_degraded` / `is_fault` / `is_fatal` (from `health`). Mode and health are independent axes: an e-stop only changes `mode`, while `health` stays driven by faults and self-test.

`RobotStatus`: `generation` / `revision` plus one status bag per capability — `power_1` / `power_2` / `head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `voice`. Only capabilities providing `status()` participate.

`RobotFaults`: `revision` plus 23 slot fault bags (`body` / `left_arm` / `right_arm` / `left_hand` / `right_hand` / `left_gripper` / `right_gripper` / `head` / `chassis` / `power_1` / `power_2` / `io` / `motion` / `teleop` / `arms` / `head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `light` / `voice`), each holding `revision` and `records: list[FaultState]`.

```python
st = robot.state()
print(st.mode, st.health)
for cause in st.root_causes:
    print(cause.code, cause.source)

agg = robot.status()
print(agg.generation, agg.power_1.energy, agg.screen.activity)

faults = robot.faults()
print(faults.revision, faults.chassis.records)
```

## events

`robot.events` subscribes to robot-wide events and can publish custom events onto the bus.

```python
robot.events.subscribe(callback, *, name: str | None = None, slot: str | None = None, on_error=None) -> SubscriptionToken
robot.events.emit(event_or_name, payload=None, *, level=..., attrs=None, slot: str = "", capability_id: str = "", code: int = 0, duration_ms: int = 0, trace_id: str = "", ts_us: int = 0) -> None
```

**Parameters** (`subscribe`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `callback` | `Callable[[Event], None]` | (required) | Receives the raw `Event`; decode with `matches()` / `from_event()` |
| `name` | `str` | `None` | Only this event name |
| `slot` | `str` | `None` | Only this slot |
| `on_error` | — | `None` | Delivery error callback; without it errors are raised on the callback thread |

Typed entries (each pushes a single event type):

| Entry | Event type | Payload |
|-------|------------|---------|
| `estop_changed` | `EstopChangedEvent` | `estop`: `EstopState` |
| `robot_state_changed` | `RobotStateChangedEvent` | `robot_state`: `RobotState` |
| `registry_changed` | `RegistryChangedEvent` | `registry`: `RegistryEvent` (`registry_revision` / `capability_id`) |
| `config_changed` | `ConfigChangedEvent` | `config`: `ConfigState` |
| `service_state_changed` | `ServiceStateChangedEvent` | `service_state`: `ServiceState` (`is_running` / `is_ready` helpers) |
| `faults_changed` | `FaultsChangedEvent` | `faults`: `RobotFaults` (typed bags per slot) |

Every event carries `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`). Subscriptions return a `SubscriptionToken`; `token.close()` unsubscribes, and `robot.close()` closes them all. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs.

```python
def on_estop(event):
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

token = robot.events.estop_changed.subscribe(on_estop)
# ...
token.close()
```

Note that the `faults_changed` payload differs from `faults()`: the event carries typed `RobotFaults` bags per slot while the raw bus payload is a flat `RobotFaultSnapshot`. See [Events & Data Channels](../../usage/events-channels.md).

## logs

`robot.logs` subscribes to and queries structured logs, and emits custom logs plus freeze requests.

```python
robot.logs.subscribe(callback, min_level=..., *, slot=None, on_error=None) -> SubscriptionToken
robot.logs.history(min_level=..., *, slot=None, unit=None, limit: int = 200) -> list[LogRecord]
robot.logs.emit(log, *, level=..., action=..., component=..., slot=..., attrs=None, trace_id=..., unit=..., domain=..., module=..., source=..., code=..., ts_us=...) -> None
robot.logs.debug(message: str, **kwargs) -> None
robot.logs.info(message: str, **kwargs) -> None
robot.logs.warn(message: str, **kwargs) -> None
robot.logs.error(message: str, **kwargs) -> None
robot.logs.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

| Member | Description |
|--------|-------------|
| `subscribe(...)` | Live log stream; `min_level` is `LogLevel.Debug` / `Info` / `Warn` / `Error`, `slot` narrows to one slot |
| `history(...)` | Tails persisted history from the observability side; `unit` filters by run unit, `limit` defaults to 200 |
| `emit(...)` | Publishes one `LogRecord`, a batch, or a plain string; `debug` / `info` / `warn` / `error` are level wrappers |
| `freeze(...)` | Asks the observability side to freeze the flight recorder |

`LogRecord` fields include `ts_us` / `level` / `component` / `action` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `attrs` / `identity` (`unit` / `domain` / `module` / `source`) / `code` / `src` / `seq` / `is_raw`.

```python
from fabot.core import LogLevel

token = robot.logs.subscribe(lambda r: print(r.level, r.message), min_level=LogLevel.Warn)
robot.logs.info("application started", component="app", domain="integration")
recent = robot.logs.history(min_level=LogLevel.Error, limit=50)
token.close()
```

## metrics

`robot.metrics` subscribes to metrics, reads the SDK's own counters and emits custom metrics.

```python
robot.metrics.subscribe(callback, *, name=None, unit=None, on_error=None) -> SubscriptionToken
robot.metrics.snapshot() -> SdkMetricSnapshot
robot.metrics.records() -> list[MetricRecord]
robot.metrics.emit(metric, value=None, *, metric_type=..., labels=None, unit=..., domain=..., module=..., source=..., ts_us=..., start_ts_us=...) -> None
robot.metrics.gauge(name: str, value, **kwargs) -> None
robot.metrics.counter(name: str, value, *, start_ts_us: int = 0, **kwargs) -> None
robot.metrics.histogram(name: str, *, count=..., sum=..., minimum=..., maximum=..., bounds=..., counts=..., samples=None, start_ts_us=..., **kwargs) -> None
```

| Member | Description |
|--------|-------------|
| `subscribe(...)` | Metric stream filtered by `name` / `unit` |
| `snapshot()` | SDK counters (connections, resolution, commands, subscriptions, logs, …) |
| `records()` | The same counters projected into `MetricRecord` objects for forwarding |
| `gauge` / `counter` / `histogram` | Emit the three metric kinds; `histogram` accepts a sample list and buckets it for you |

`SdkMetricSnapshot` fields: `connected` / `resolve_success` / `resolve_failure` / `resolve_cache_hits` / `command_success` / `command_failure` / `command_errors` (per error category) / `channel_subscriptions` / `log_counts` (per level) / `log_records_dropped` / `ts_us` / `start_ts_us`. `connected` is the current reading (gauge); everything else is cumulative since process start (counter).

```python
robot.metrics.gauge("app.queue.depth", 3, unit="count")
robot.metrics.counter("app.jobs.done", 1)
robot.metrics.histogram("app.job.ms", samples=[12.0, 18.5, 41.0], unit="ms")

snap = robot.metrics.snapshot()
print(snap.connected, snap.command_success, snap.command_errors)
```

## frames

`robot.frames` returns a `FrameSystem`: in-process frame queries and transforms fed by the shared-memory coordinate tree the robot publishes, with no ROS dependency.

```python
robot.frames.lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
robot.frames.can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
robot.frames.wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
robot.frames.list_frames() -> list[str]
robot.frames.transform(entity, target_frame: str, child_frame: str = "")
robot.frames.transform_pose(pose, target_frame, *, end_frame="", current_end_frame="", stamp_ns=0)
robot.frames.transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0)
robot.frames.set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
robot.frames.set_tool(side: str, parent: str, tool: str, transform) -> None
robot.frames.scoped_frame(parent: str, child: str, transform, authority: int = 4)
robot.frames.to_mermaid() -> str
```

**Parameters** (`lookup` / `can_transform`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `target` | `str` | (required) | Target frame name |
| `source` | `str` | (required) | Source frame name |
| `stamp_ns` | `int` | `0` | Query time in ns; `0` means latest |

Frame names follow `^[a-z][a-z0-9_]*(/[a-z][a-z0-9_]*)*$` with length 1–127. Failures raise subclasses of `FrameError`: `FrameNotFoundError` (unknown name), `FrameConnectivityError` (disconnected trees), `FrameCycleError`, `FrameAuthorityError`, `InvalidFrameNameError`, `FrameTimeoutError`, and others.

Well-known names live on `fabot.frames.Frame`: `BASE_LINK` / `BASE_FOOTPRINT` / `ARM_BASE` / `ODOM` / `MAP` / `LEFT_EEF` / `RIGHT_EEF` / `HEAD_EEF`.

```python
from fabot.frames import Frame, Transform3d

tf = robot.frames.wait_for_transform(Frame.BASE_LINK, "head_camera_color_optical")
print(tf.target_frame, tf.source_frame, tf.position, tf.euler_rpy)

pose_in_map = robot.frames.transform(robot.left_arm.get_pose(), Frame.MAP)
points = robot.frames.transform_points([[0.0, 0.0, 1.0]], "base_link", "map")
print(robot.frames.to_mermaid())
```

Full algebra (`Transform3d` composition, inverse, interpolation, applying to points / vectors / twists / wrenches), `TransformBuffer` and caching semantics are in [Frames & Transforms](../../usage/frames.md); matrix and deprojection helpers are in [Frames API](../python/frames.md).

## configuration / connection / services / skills

Remaining robot-wide entries:

| Entry | Description |
|-------|-------------|
| `robot.configuration` | Robot config read/write (`get()` / `apply()`) with CAS, see [Configuration](../../usage/configuration.md) |
| `robot.connection` | Connection state query and subscription (`is_connected()` / `connected` / `subscribe()`) |
| `robot.services` | Platform service handles (`ocs2` / `orbbec_sdk_ros2`), see [Platform Services](../../usage/services.md) |
| `robot.skills` | Skill handles (`camera_sync` / `voice_aiui`), see [Skills & Extensions](../../usage/skills.md) |

## ping / freeze

`ping` measures runtime round-trip latency; `freeze` asks the observability side to snapshot the flight recorder (`logs.freeze()` is the same thing).

```python
robot.ping(payload: bytes = b"", count: int = 1, timeout_ms: int = 1000, *, timeout: float | None = None) -> PingReport
robot.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

**Parameters** (`ping`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `payload` | `bytes` | `b""` | Payload bytes, useful for measuring latency with large messages |
| `count` | `int` | `1` | Number of samples |
| `timeout_ms` | `int` | `1000` | Per-probe timeout in ms; `timeout` is the seconds spelling |

`PingReport` gives `samples` (each with `rtt_us` / `handler_us` / `shm_read_us` / `byte_count`) plus `min_us` / `max_us` / `mean_us` / `p50_us` / `p99_us`. Slot proxies carry the same `ping`, scoped to that slot.
