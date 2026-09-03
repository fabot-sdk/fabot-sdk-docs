---
title: Connection & Robot Entry
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Connection & Robot Entry

`Robot` is the SDK's unified entry point: it holds the connection, exposes capability proxies by slot, and aggregates whole-robot status and events.

## Establishing a Connection

```python
from fabot import Robot

# Connect by control-plane endpoint (zenohd, default 7557)
robot = Robot.connect("192.168.1.10", 7557)

# Equivalent form
robot = Robot.from_endpoint("192.168.1.10", 7557)

# Connect from a config object
from fabot.core import ClientConfig, ClientOptions
config = ClientConfig(client_id="fabot_sdk")      # zenoh_config_file / auth_token optional
options = ClientOptions(resolve_timeout_ms=1000, command_timeout_ms=3000)
robot = Robot.from_config(config, options)

# Close (a `with` context manager is also supported)
robot.close()
```

## Waiting for Readiness & Connection State

- `wait_ready(slots=None)`: blocks until the given slots (all by default) are available.
- `connection` property: `is_connected()` query, `subscribe(cb)` subscription to Manager connection changes (`ManagerConnectionChangedEvent`).

## Capability Slots

Capabilities are exposed by slot as **read-only attributes**, 22 slots in total:

| Slot attribute | Capability module | Slot attribute | Capability module |
|----------------|---------------------|----------------|---------------------|
| `io` | io | `motion` | motion |
| `screen` | screen | `teleop` | teleop |
| `chassis` | chassis | `arms` | arms |
| `left_arm` / `right_arm` | arm | `left_hand` / `right_hand` | hand |
| `left_gripper` / `right_gripper` | gripper | `head` | head |
| `body` | body | `light` | light |
| `power_1` / `power_2` | power | `voice` | voice |
| `head_camera` / `chest_camera` | camera | `left_wrist_camera` / `right_wrist_camera` | camera |

- Accessing a slot with no adapter bound raises `AdapterUnbound` (`NotFound`, code 6002); check `has_adapter` first.
- When you need the strongly typed config/extensions of a concrete adapter implementation, use `proxy.as_adapter(FabotIo)` (a typed proxy under `fabot.adapters`); a type mismatch raises `AdapterMismatch`.

## Whole-Robot Methods

`state()` / `status()` / `faults()` / `version()` / `sdk_version`; see [Status, Faults & Lifecycle](status-faults.md) for details.

## Offline Development & Testing

`Robot.mock()` returns a `MockRobot` for development and joint debugging without a real robot; see [Mock Testing](mock.md).
