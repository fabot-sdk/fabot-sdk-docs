---
title: Platform Services
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Platform Services

Platform services (such as `fabot_ocs2`) expose only a **small set of platform operations** to the SDK: start / stop / restart, state queries and config access. Business APIs are not open to clients. Only services declared client-visible show up in `robot.services`.

## Entries and services

`robot.services` exposes a handle per client-visible service, by short name:

| Property | service id | Handle | Config type |
|----------|-----------|--------|-------------|
| `robot.services.ocs2` | `fabot_ocs2` | `Ocs2ServiceHandle` | `Ocs2Config` |
| `robot.services.orbbec_sdk_ros2` | `fabot_orbbec_sdk_ros2` | `OrbbecSdkRos2ServiceHandle` | `OrbbecSdkRos2Config` |

The `SERVICE_ID` / `CONFIG` class attributes on each handle give the service id and config type.

- `ocs2` is the launch entry of the motion-control (whole-body) stack; its `launch` config decides what starts, whether real or simulated hardware is used, and the left/right end-effector models.
- `orbbec_sdk_ros2` is the Orbbec ROS camera backend, normally not started by default in a product deployment; call `start()` explicitly when you need it.

## Platform operations

| Operation | Description |
|-----------|-------------|
| `start()` / `stop()` / `restart()` | Lifecycle control |
| `state()` | `ServiceState` snapshot |
| `is_running()` | Running check (same as `state().is_running`) |
| `get_config()` / `set_config(cfg)` | Read / CAS-update the service config (raises `ConfigurationConflict`) |

```python
svc = robot.services.ocs2               # Ocs2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # typed config dataclass
svc.set_config(cfg)                     # CAS; raises ConfigurationConflict
```

## Lifecycle control

`start()` / `stop()` / `restart()` are synchronous: they submit the desired state and raise `FabotError` when the request fails (see [Error Handling](errors.md)). Process transitions are asynchronous, so confirm with `state()` / `is_running()` after the call, or subscribe to `service_state_changed`.

:::warning
`stop()` / `restart()` affect everything that depends on the service. While the motion-control stack restarts, arms and chassis are unavailable.
:::

## State query

`state()` returns `ServiceState`:

| Field | Type | Description |
|-------|------|-------------|
| `service_id` | `str` | Service id (such as `fabot_ocs2`) |
| `desired` | `ServiceDesiredState` | Desired state: `Unknown` / `Running` / `Stopped` |
| `state` | `ServiceRunState` | Observed state: `Unknown` / `Starting` / `Ready` / `Stopping` / `Stopped` / `Failed` |
| `pid` | `int` | Process id (`-1` when not running) |
| `restart_count` | `int` | Cumulative restarts |
| `source_instance_id` | `str` | Source instance id |

Two convenience properties: `is_running` (`state` is `Starting` or `Ready`) and `is_ready` (`state` is `Ready`).

## Service configuration

`get_config()` returns a typed config dataclass (`to_yaml()` / `from_yaml()` / `field_options()`); `set_config(cfg)` commits with CAS and raises `ConfigurationConflict` on contention (see [Error Handling](errors.md)), returning the freshly read config on success.

```python
from fabot.errors import ConfigurationConflict

svc = robot.services.ocs2
cfg = svc.get_config()
print(cfg.to_yaml())                    # the effective launch config

cfg.launch.hardware = "real"            # fields are StrEnums and accept strings
try:
    cfg = svc.set_config(cfg)           # CAS; returns the latest config
except ConfigurationConflict:
    cfg = svc.get_config()              # re-read, merge, retry
```

`Ocs2Config.field_options()` lists the legal values per field (such as `launch.hardware` with `real` / `real_usb` / `mock_components` / `isaac`), which is convenient for building dropdowns. The retry pattern is the same as for robot configuration, see [Configuration](configuration.md).

## Observing service state

Service transitions are pushed through `robot.events.service_state_changed` (`ServiceStateChangedEvent`):

```python
def on_service_state(event):
    st = event.service_state                # ServiceState
    print(st.service_id, st.desired, st.state, st.is_running)

token = robot.events.service_state_changed.subscribe(on_service_state)
```

Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs such as `start()`; see [Events & Data Channels](events-channels.md).

:::note
`Robot.mock()` provides `robot.services`, but control operations merely succeed and state stays in memory. Tests that need real service behaviour still require a robot or a platform test environment, see [Mock Testing](mock.md).
:::
