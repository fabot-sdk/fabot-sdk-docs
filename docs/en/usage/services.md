---
title: Platform Services
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Platform Services

Platform services on the robot (services, e.g. `fabot_ocs2`) expose only **7 platform operations** to the SDK; business interfaces are not open to clients. Services with `client_control: none` do not appear in `robot.services`.

## Entry Point & Service List

`robot.services` exposes a handle for each client-visible service under a short name:

| Attribute | service id | Handle type | Config type |
|-----------|-----------|-------------|-------------|
| `robot.services.ocs2` | `fabot_ocs2` | `FabotOcs2ServiceHandle` | `FabotOcs2ServiceConfig` |

The `SERVICE_ID` / `CONFIG` class attributes on a handle give the service id and the config type.

## The 7 Platform Operations

| Operation | Notes |
|-----------|-------|
| `start()` / `stop()` / `restart()` | Lifecycle control |
| `state()` | `ServiceState` snapshot |
| `is_running()` | Whether it is running (equivalent to `state().is_running`) |
| `get_config()` / `set_config(cfg)` | Read / CAS-modify the service configuration (conflicts raise `ConfigurationConflict`) |

```python
svc = robot.services.ocs2               # FabotOcs2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # strongly typed config dataclass
svc.set_config(cfg)                     # CAS; conflicts raise ConfigurationConflict
```

## Lifecycle Control

`start()` / `stop()` / `restart()` are synchronous calls: they submit the desired state to the platform and raise `FabotError` if the command fails (see [Error Handling](errors.md)). The process state transitions asynchronously — confirm with `state()` / `is_running()` after the call returns, or track the transition via the `service_state_changed` event.

:::warning
`stop()` / `restart()` affects functionality that depends on the service; confirm the blast radius before invoking them.
:::

## State Query

`state()` returns a `ServiceState`:

| Field | Type | Notes |
|-------|------|-------|
| `service_id` | `str` | Service id (e.g. `fabot_ocs2`) |
| `desired` | `ServiceDesiredState` | Desired state: `Unknown` / `Running` / `Stopped` |
| `state` | `ServiceRunState` | Observed state: `Unknown` / `Starting` / `Ready` / `Stopping` / `Stopped` / `Failed` |
| `pid` | `int` | Process id (`-1` when not running) |
| `restart_count` | `int` | Cumulative restart count |
| `source_instance_id` | `str` | Id of the instance that reported the state |

Two convenience properties are also available: `is_running` (`state` is `Starting` / `Ready`) and `is_ready` (`state` is `Ready`).

## Service Configuration

`get_config()` returns a strongly typed config dataclass (supports `to_yaml()` / `from_yaml()`); `set_config(cfg)` commits via CAS — it raises `ConfigurationConflict` (code 81001, see [Error Handling](errors.md)) on a `revision` conflict and returns the freshly re-read configuration on success.

```python
from fabot.errors import ConfigurationConflict
from fabot.services.fabot_ocs2 import LaunchHardware

svc = robot.services.ocs2
cfg = svc.get_config()
cfg.launch.hardware = LaunchHardware.Real   # fields are StrEnum or nested dataclasses

try:
    cfg = svc.set_config(cfg)               # CAS; returns the latest config on success
except ConfigurationConflict:
    cfg = svc.get_config()                  # re-read, merge your changes, retry
```

The general conflict-retry pattern is the same as for whole-robot configuration; see [Configuration Management](configuration.md).

## Observing Service State Changes

Service state transitions are pushed via the whole-robot event `robot.events.service_state_changed` (`ServiceStateChangedEvent`):

```python
def on_service_state(event):
    st = event.service_state                # ServiceState
    print(st.service_id, st.desired, st.state, st.is_running)

token = robot.events.service_state_changed.subscribe(on_service_state)
```

Callbacks run on the SDK's I/O thread: keep them lightweight and never call blocking APIs such as `start()` inside a callback; see [Events & Data Channels](events-channels.md) for the general subscription rules.

:::note
`MockRobot` returned by `Robot.mock()` does not provide `robot.services`; stub service calls yourself in tests. See [Mock Testing](mock.md).
:::
