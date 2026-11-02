---
title: Connection & Robot Entry
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Connection & Robot Entry

`Robot` is the single entry point of the SDK: it owns the connection to the robot control plane, exposes capability proxies per slot, and aggregates the robot-wide e-stop, events, status and configuration. This page covers establishing and closing a connection, client options, waiting for slots, and subscribing to connection state. Full member signatures are in [Robot Entry](../reference/python/robot.md).

## Connecting

```python
from fabot import Robot

# Connect by control-plane endpoint (default port 7557)
robot = Robot.connect("192.168.1.10", 7557)

# Equivalent: from_endpoint only accepts an explicit endpoint
robot = Robot.from_endpoint("192.168.1.10", 7557)

# Connect from a config object
from fabot.core import ClientConfig, ClientOptions

config = ClientConfig(client_id="fabot_sdk")
options = ClientOptions(resolve_timeout_ms=1000, command_timeout_ms=3000)
robot = Robot.from_config(config, options)

# Connect and wait for slots in one call
robot = Robot.connect("192.168.1.10", 7557, wait_ready=True)

# Prefer `with` so the connection is closed on exit
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
```

- With an empty `host`, `connect` uses the endpoint from `config`; passing both raises `TypeError`.
- Factory methods block until the connection is established and raise `FabotError` on failure (see [Troubleshooting](../troubleshooting.md) for connection issues).
- Factory methods and `close()` must not be called from an event callback (the SDK I/O thread), or `ClientThreadError` is raised.
- `from_backend(backend, options)` plugs in a custom transport backend (advanced); `Robot.mock()` returns a `MockRobot` that needs no robot, see [Mock Testing](mock.md).
- `close()` closes every subscription and the connection; a closed `Robot` is unusable. Environment prerequisites are in [Requirements](../install/requirements.md).

`ClientConfig` (identity and transport; every field is optional):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `client_id` | `str` | `"fabot_sdk"` | Client identifier |
| `zenoh_config_file` | `str` | `""` | Custom transport config file |
| `auth_token` | `bytes` | `b""` | Auth token |
| `max_control_message_bytes` | `int` | `1048576` | Control message ceiling in bytes |

`ClientOptions` (timeouts and caches; every field is optional):

| Field | Type | Default | Description |
|------|------|---------|-------------|
| `resolve_timeout_ms` | `int` | `1000` | Slot resolution timeout in ms, also the per-slot `wait_ready` budget |
| `command_timeout_ms` | `int` | `3000` | Default Command timeout in ms, overridable per call |
| `resolve_cache_ttl_ms` | `int` | `30000` | Resolution cache lifetime in ms |
| `resolve_cache_capacity` | `int` | `256` | Resolution cache capacity |
| `completion_executor` | — | `None` | Executor for async completion callbacks |
| `channel_renew_threads` | `int` | `2` | Workers renewing channel leases (shared by the client, independent of channel count) |
| `preview_host` | `str` | `""` | Router host recorded by `from_endpoint`, used to rewrite loopback preview URIs |

## Waiting for readiness

`wait_ready(slots=None)` blocks until the given slots (all by default) resolve:

```python
robot.wait_ready()                       # every bound slot
robot.wait_ready(["left_arm", "io"])     # only these slots
```

Semantics: it reads the current slot configuration and blocks only on target slots that are **enabled, essential and have an adapter bound**. Unbound, disabled or non-essential slots are skipped. The per-slot budget comes from `ClientOptions.resolve_timeout_ms`, and a failed resolution raises.

## Connection state

`robot.connection` reports and streams connection state:

```python
if robot.connection.is_connected():
    print("connected")

print(robot.connection.connected)     # property equivalent to is_connected()

def on_connection(state):
    print("connected:", state.connected)

token = robot.connection.subscribe(on_connection)
# ...
token.close()    # unsubscribe; robot.close() closes every subscription
```

- `is_connected()`: whether the control plane is currently reachable. It answers from cache when already connected, otherwise it confirms once.
- `connected`: read-only property equivalent to `is_connected()`.
- `subscribe(callback)`: the callback receives `ConnectionState` (a single `connected: bool`); it fires once immediately with the current state and then on every change. Returns a `SubscriptionToken`; call `token.close()` to unsubscribe.
- Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Subscribing from inside a callback is also not allowed.

## Capability slots

Capabilities are exposed as **read-only properties**, 23 slots in total; `robot.slots` returns a mapping from slot id to proxy:

| Slot property | Capability | Slot property | Capability |
|---------------|------------|---------------|------------|
| `io` | io | `motion` | motion |
| `screen` | screen | `teleop` | teleop |
| `chassis` | chassis | `arms` | arms |
| `left_arm` / `right_arm` | arm | `left_hand` / `right_hand` | hand |
| `left_gripper` / `right_gripper` | gripper | `head` | head |
| `body` | body | `light` | light |
| `power_1` / `power_2` | power | `voice` | voice |
| `head_camera` / `chest_camera` / `waist_camera` | camera | `left_wrist_camera` / `right_wrist_camera` | camera |

- With no adapter bound, capability methods are still dispatched (the platform then fails or times out); `as_adapter()` and `get_config()` raise `AdapterUnbound` (a `NotFound`). To gate strictly, check `has_adapter` (a read-only property) first:

  ```python
  from fabot.capabilities.io import PinDirection

  if robot.io.has_adapter:
      robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
      robot.io.set_level(pin=17, value=True)
  ```

- To reach adapter-specific typed configuration or extensions use `proxy.as_adapter(Io)` (the typed view under `fabot.adapters`). An unbound slot raises `AdapterUnbound`; a mismatched adapter raises `AdapterMismatch`. See [Error Handling](errors.md).

Every slot proxy also exposes `slot_id`, `handle`, `events`, `health()`, `lifecycle()`, `faults()`, `ping()` and config access, see [Capability Interfaces Overview](../reference/python/index.md).

## Robot-wide entries

- `state()` / `status()` / `faults()` / `version()` / `sdk_version`: aggregated robot state, see [Status, Faults & Lifecycle](status-faults.md).
- `estop`: engage, release and query the e-stop (`engage` / `release` / `state` / `is_asserted`).
- `events`: robot-wide event subscription plus custom event emission, see [Events & Data Channels](events-channels.md).
- `logs` / `metrics`: log and metric streams, history, custom emission and freezing, see [Logs, Metrics & Observability](observability.md).
- `frames`: coordinate-frame queries and transforms, see [Frames & Transforms](frames.md).
- `configuration`: slot bindings and config access, see [Configuration](configuration.md).
- `services`: platform services, see [Platform Services](services.md).
- `skills`: skill entries (`camera_sync` / `voice_aiui`), see [Skills & Extensions](skills.md).
- `slots`: mapping from slot id to proxy.

## Offline development

`Robot.mock()` returns a `MockRobot` with the same interface, so you can develop without a robot. Boundaries and limits are in [Mock Testing](mock.md).
