---
title: Robot Entry
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Robot Entry

`Robot` is the Python SDK's unified entry point: it opens a connection, exposes capability proxies by slot, and aggregates whole-robot estop, events, and status. See [Connection & Robot Entry](../../usage/connection.md) for the conceptual overview.

## connect

`Robot.connect` / `from_endpoint` / `from_config` open a connection; `close()` or a `with` context closes it.

```python
Robot.connect(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_endpoint(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_config(config: ClientConfig | None = None, options: ClientOptions | None = None) -> Robot
Robot.from_backend(backend, options: ClientOptions | None = None) -> Robot
Robot.mock() -> MockRobot
robot.close() -> None
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `ip` / `port` | `str` / `int` | (required) | Control-plane endpoint; default port 7557 |
| `config` | `ClientConfig` | `None` | Client identity and transport options, see below |
| `options` | `ClientOptions` | `None` | Timeout and cache options, see below |

`connect` is an alias of `from_endpoint`; `from_backend` plugs in a custom transport backend (advanced usage); `mock()` returns a `MockRobot` that needs no real robot, see [Mock Testing](../../usage/mock.md).

`ClientConfig`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `client_id` | `str` | `"fabot_sdk"` | Client identity |
| `zenoh_config_file` | `str` | `""` | Custom transport config file path |
| `auth_token` | `bytes` | `b""` | Authentication token |
| `max_control_message_bytes` | `int` | `1048576` | Control message size limit (bytes) |

`ClientOptions`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resolve_timeout_ms` | `int` | `1000` | Slot resolve timeout (milliseconds) |
| `command_timeout_ms` | `int` | `3000` | Default Command timeout (milliseconds) |
| `resolve_cache_ttl_ms` | `int` | `30000` | Resolve cache TTL (milliseconds) |
| `resolve_cache_capacity` | `int` | `256` | Resolve cache capacity |
| `completion_executor` | — | `None` | Completion executor for async callbacks |
| `channel_renew_threads` | `int` | `2` | Worker threads renewing channel leases |

The factory methods block until the connection is established and raise `FabotError` on failure; they must not be called from an event callback (the SDK I/O thread), or `ClientThreadError` is raised. `close()` closes all subscriptions and the connection; leaving a `with` context closes automatically.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.sdk_version, robot.version())
```

Other whole-robot entries: `robot.connection` (connection-state query and subscription), `robot.configuration` (slot bindings and configuration access, see [Configuration](../../usage/configuration.md)), `robot.services` (platform service management, see [Platform Services](../../usage/services.md)), `robot.logs` (log stream subscription).

## wait_ready

`wait_ready(slots=None)` blocks until the given slots (all by default) are available.

```python
wait_ready(slots: Sequence[str] | None = None) -> None
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `slots` | `Sequence[str]` | `None` | Slot ids to wait for; `None` means all 22 slots |

Semantics: reads the current slot configuration and blocking-resolves the handle of every target slot that is **enabled, required, and bound**; slots that are unbound, disabled, or `required=False` are skipped, not waited on. The per-slot resolve timeout is `ClientOptions.resolve_timeout_ms`; a failed resolve raises.

```python
robot.wait_ready()                       # all bound slots
robot.wait_ready(["left_arm", "io"])     # only the given slots
```

## slots

Capabilities are exposed as read-only slot attributes (`robot.io`, `robot.chassis`, and so on); there are 22 slots.

| Slot attribute | Capability id | Docs |
|----------------|---------------|------|
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
| `head_camera` / `chest_camera` | `camera` | [Camera](camera.md) |
| `left_wrist_camera` / `right_wrist_camera` | `camera` | [Camera](camera.md) |
| `screen` | `screen` | [Screen](screen.md) |
| `light` | `light` | [Light](light.md) |
| `voice` | `voice` | [Voice](voice.md) |

Members shared by every slot proxy:

| Member | Description |
|--------|-------------|
| `slot_id` | Slot id |
| `handle` | Slot handle (resolved lazily; a failed resolve raises) |
| `events` | Typed event entries for this slot |
| `health()` | Current health |
| `lifecycle()` | `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`) |
| `faults()` | Current fault bag for this slot |
| `has_adapter` | Whether an adapter is bound to the slot |
| `as_adapter(adapter_type)` | Cast to a strongly typed adapter view under `fabot.adapters` |

Calling capability methods on an unbound slot raises `AdapterUnbound` (a `NotFound`); check `has_adapter` first. `as_adapter` requires `adapter_type` to expose `ADAPTER_ID` (otherwise `TypeError`); it raises `AdapterUnbound` when the slot is unbound and `AdapterMismatch` when the bound adapter does not match `adapter_type`.

```python
if robot.left_arm.has_adapter:
    print(robot.left_arm.get_joints())

from fabot.adapters import FabotArm

arm = robot.left_arm.as_adapter(FabotArm)
```

## estop

`robot.estop` provides `engage` / `release` / `state`; all three return the latest `EstopState` snapshot.

```python
robot.estop.engage(reason: str = "", source: str = "") -> EstopState
robot.estop.release(reason: str = "", source: str = "") -> EstopState
robot.estop.state() -> EstopState
```

**Parameters** (`engage` / `release`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `reason` | `str` | `""` | Reason for engaging / releasing |
| `source` | `str` | `""` | Source identifier |

**`EstopState` fields**

| Field | Type | Description |
|-------|------|-------------|
| `asserted` | `bool` | Whether the estop is asserted |
| `revision` | `int` | State revision |
| `asserted_at_us` / `cleared_at_us` | `int` | Timestamps (microseconds) of the latest engage / release |
| `reason` | `str` | Engage reason |
| `source_id` | `str` | Engage source id |

`engage` latches the whole-robot estop and the robot run state becomes `RobotRunState.Estopped` (`robot.state().is_estopped` is `True`); `release` clears the latch. Estop changes are pushed via `robot.events.estop_changed`. Recovery: after confirming the scene is safe, call `release`, then check `robot.state()` to confirm the robot has left `Estopped`, and inspect `robot.faults()` for faults recorded while estopped.

```python
state = robot.estop.engage(reason="safety check")
print(state.asserted, state.reason)

robot.estop.release(reason="check done")
print(robot.estop.state().asserted)
```

## events

`robot.events` subscribes to whole-robot events (`estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed`). See [Events & Data Channels](../../usage/events-channels.md).

Every subscription returns a `SubscriptionToken`; unsubscribe with `token.close()`, and `robot.close()` closes all subscriptions at once. Callbacks run on the SDK I/O thread: keep them lightweight and never call blocking APIs from them.

| Entry | Event type | Payload |
|-------|------------|---------|
| `estop_changed` | `EstopChangedEvent` | `estop`: `EstopState`, fields in [estop](#estop) |
| `robot_state_changed` | `RobotStateChangedEvent` | `robot_state`: `RobotState`, fields in [status](#status) |
| `registry_changed` | `RegistryChangedEvent` | `registry`: `RegistryEvent` (`registry_revision` / `capability_id`) |
| `config_changed` | `ConfigChangedEvent` | `config`: `ConfigState` (`revision` / `runtime_revision` / `slots` / `domains`, etc.) |
| `service_state_changed` | `ServiceStateChangedEvent` | `service_state`: `ServiceState` (`service_id` / `desired` / `state` / `pid` / `restart_count` / `source_instance_id`; convenience properties `is_running` / `is_ready`) |
| `faults_changed` | `FaultsChangedEvent` | `faults`: `RobotFaultSnapshot` (`revision` + `faults: list[RobotFaultRecord]`; each record has `capability_id` / `instance_id` / `fault_id` / `catalog_id` / `fault_class` / `first_seen_us` / `last_seen_us` / `count`). Note this differs in shape from the `RobotFaults` returned by `faults()` (organized per slot) |

Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`). `robot.events.subscribe(callback)` subscribes to every event on the bus; the callback receives raw `Event` envelopes that you can discriminate and decode with each event type's `matches()` / `from_event()`.

```python
def on_estop(event):
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

token = robot.events.estop_changed.subscribe(on_estop)
# ...
token.close()
```

## status

`state()` / `status()` / `faults()` / `version()` / `sdk_version` aggregate whole-robot status. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

| Method | Returns | Description |
|--------|---------|-------------|
| `state()` | `RobotState` | Whole-robot run-state snapshot |
| `status()` | `RobotStatus` | Aggregated capability status bags |
| `faults()` | `RobotFaults` | Aggregated current faults of all slots |
| `version()` | `str` | Platform version |
| `sdk_version` | `str` | SDK's own version (property, not a method) |

All of these are polled queries (GET-only); changes are pushed via the event streams in [events](#events).

`RobotState`:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `RobotRunState` | `Unknown` / `Idle` / `Running` / `Degraded` / `Fault` / `Estopped` |
| `reasons` | `list[str]` | Reasons for entering the current state |
| `revision` | `int` | State revision |
| `source_instance_id` | `str` | Source instance id |

Convenience properties: `is_running` / `is_idle` / `is_degraded` / `is_fault` / `is_estopped`.

`RobotStatus`:

| Field | Type | Description |
|-------|------|-------------|
| `generation` | `int` | Status generation |
| `revision` | `int` | Status revision |
| `power_1` / `power_2` | `PowerStatus` | Power status bags; fields in [Power](power.md) |
| `screen` | `ScreenStatus` | Screen status bag; fields in [Screen](screen.md) |
| `voice` | `VoiceStatus` | Voice status bag; fields in [Voice](voice.md) |

Only power / screen / voice currently provide status bags; the other slots do not participate in the aggregation (their fields keep default values).

`RobotFaults`: `revision` (`int`) plus 22 per-slot fault-bag fields (`body` / `left_arm` / `right_arm` / `left_hand` / `right_hand` / `left_gripper` / `right_gripper` / `head` / `chassis` / `power_1` / `power_2` / `io` / `motion` / `teleop` / `arms` / `head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `light` / `voice`); see the "Faults" section of each capability module page for the bag types.

```python
st = robot.state()
if st.is_estopped:
    print(st.reasons)

faults = robot.faults()
print(faults.revision, faults.chassis)
```
