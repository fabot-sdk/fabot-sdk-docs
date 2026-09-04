---
title: Connection & Robot Entry
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Connection & Robot Entry

`Robot` is the SDK's unified entry point: it holds the connection to the robot control plane, exposes capability proxies by slot, and aggregates whole-robot estop, events, status, and configuration. This page covers how to establish and close a connection, configure client options, wait for slot readiness, and subscribe to connection state; for full signatures of every `Robot` member, see [Robot Entry](../reference/python/robot.en.md).

## Establishing a Connection

```python
from fabot import Robot

# Connect by control-plane endpoint (default port 7557)
robot = Robot.connect("192.168.1.10", 7557)

# Equivalent form: connect is an alias of from_endpoint
robot = Robot.from_endpoint("192.168.1.10", 7557)

# Connect from a config object
from fabot.core import ClientConfig, ClientOptions
config = ClientConfig(client_id="fabot_sdk")
options = ClientOptions(resolve_timeout_ms=1000, command_timeout_ms=3000)
robot = Robot.from_config(config, options)

# Prefer a `with` block; close() runs automatically on exit
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
```

- Factory methods block until the connection is established and raise `FabotError` on failure (see [Troubleshooting](../troubleshooting.md) for connection issues).
- Factory methods and `close()` must not be called from an event callback (the SDK I/O thread); doing so raises `ClientThreadError`.
- `from_backend(backend, options)` plugs in a custom transport backend (advanced usage); `Robot.mock()` returns a `MockRobot` that needs no real robot — see [Mock Testing](mock.md).
- `close()` shuts down all subscriptions and the connection; a closed `Robot` must not be reused. For environment prerequisites, see [Requirements](../install/requirements.md).

`ClientConfig` (client identity and transport options; every field is optional):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `client_id` | `str` | `"fabot_sdk"` | Client identifier |
| `zenoh_config_file` | `str` | `""` | Path to a custom transport config file |
| `auth_token` | `bytes` | `b""` | Authentication token |
| `max_control_message_bytes` | `int` | `1048576` | Control message size limit (bytes) |

`ClientOptions` (timeout and cache options; every field is optional):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resolve_timeout_ms` | `int` | `1000` | Slot resolve timeout (ms); also the per-slot wait limit of `wait_ready` |
| `command_timeout_ms` | `int` | `3000` | Default Command timeout (ms), overridable per call |
| `resolve_cache_ttl_ms` | `int` | `30000` | Resolve cache TTL (ms) |
| `resolve_cache_capacity` | `int` | `256` | Resolve cache capacity |
| `completion_executor` | — | `None` | Completion executor for async callbacks |
| `channel_renew_threads` | `int` | `2` | Worker threads renewing channel leases (shared across the client, independent of channel count) |

## Waiting for Readiness

`wait_ready(slots=None)` blocks until the given slots (all by default) are resolved:

```python
robot.wait_ready()                       # all bound slots
robot.wait_ready(["left_arm", "io"])     # only the given slots
```

Semantics: reads the current slot configuration and blocks on resolving only the target slots that are **enabled, required, and bound to an adapter**; unbound, disabled, or `required=False` slots are skipped without waiting. The per-slot resolve timeout is governed by `ClientOptions.resolve_timeout_ms`; a resolve failure raises an exception.

## Connection State

`robot.connection` provides connection-state query and subscription:

```python
if robot.connection.is_connected():
    print("connected")

def on_connection(state):
    print("connected:", state.connected)

token = robot.connection.subscribe(on_connection)
# ...
token.close()    # unsubscribe; robot.close() closes all subscriptions
```

- `is_connected()`: whether the control plane is currently connected.
- `subscribe(callback)`: the callback receives a `ConnectionState` (a single field `connected: bool`); it is invoked once immediately with the current state, then again on every connection change. Returns a `SubscriptionToken`; unsubscribe with `token.close()`.
- Callbacks run on the SDK I/O thread: keep them lightweight and never call blocking APIs inside them. Subscribing itself must not be done from the callback thread either.

## Capability Slots

Capabilities are exposed by slot as **read-only attributes**, 22 slots in total:

| Slot attribute | Capability module | Slot attribute | Capability module |
|----------------|-------------------|----------------|-------------------|
| `io` | io | `motion` | motion |
| `screen` | screen | `teleop` | teleop |
| `chassis` | chassis | `arms` | arms |
| `left_arm` / `right_arm` | arm | `left_hand` / `right_hand` | hand |
| `left_gripper` / `right_gripper` | gripper | `head` | head |
| `body` | body | `light` | light |
| `power_1` / `power_2` | power | `voice` | voice |
| `head_camera` / `chest_camera` | camera | `left_wrist_camera` / `right_wrist_camera` | camera |

- Accessing capability methods of a slot with no adapter bound raises `AdapterUnbound` (category `NotFound`); check the `has_adapter` read-only attribute first:

  ```python
  if robot.io.has_adapter:
      robot.io.set_digital_output(channel="do0", value=True)
  ```

- When you need the strongly typed config/extensions of a concrete adapter implementation, use `proxy.as_adapter(FabotIo)` (a typed view under `fabot.adapters`); an unbound slot raises `AdapterUnbound`, and a mismatched adapter type raises `AdapterMismatch`. See [Error Handling](errors.md) for both.

For each slot proxy's capability API, see the [Python API Reference](../reference/python/index.md).

## Whole-Robot Entries

- `state()` / `status()` / `faults()` / `version()` / `sdk_version`: whole-robot status aggregation — see [Status, Faults & Lifecycle](status-faults.md).
- `estop`: estop engage and release (`engage` / `release` / `state`).
- `events`: whole-robot event subscriptions (estop, run-state, config, faults changes, etc.) — see [Events & Data Channels](events-channels.md).
- `configuration`: slot binding and configuration read/write — see [Configuration Management](configuration.md).
- `services`: platform service management — see [Platform Services](services.md).
- `logs`: log-stream subscription.

## Offline Development & Testing

`Robot.mock()` returns a `MockRobot` with the same interface as `Robot`, enabling development and joint debugging without a real robot; see [Mock Testing](mock.md) for its coverage and limits.
