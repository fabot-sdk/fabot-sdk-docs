---
title: Platform Services Overview
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Platform Services Overview

## Module Overview

- Entries: `robot.services` / `robot.environments`
- Services are long-running processes on the robot. The SDK exposes only a **small set of platform operations**: start / stop, state queries and config access. Business APIs are not open to clients.
- Two client-visible services have their API published here: `ros2` and `obs_collector`. `environments` is runtime **configuration** (not a process); currently only `ros2`.

| Property | service id | Handle | Config type | Config domains | Chapter |
|----------|-----------|--------|-------------|----------------|---------|
| `robot.services.ros2` | `fabot_ros2` | `Ros2ServiceHandle` | `Ros2Config` | `node` | [ros2.md](ros2.md) |
| `robot.services.obs_collector` | `fabot_obs_collector` | `ObsCollectorServiceHandle` | `ObsCollectorConfig` | `obs` | [obs_collector.md](obs_collector.md) |
| `robot.environments.ros2` | `fabot_env_ros2` | `Ros2EnvironmentHandle` | `Ros2EnvironmentConfig` | `communication` | [ros2_environment.md](ros2_environment.md) |

The `SERVICE_ID` / `CONFIG` class attributes on each handle give the service id and config type. `ros2` also carries a capability-proxy-style slot surface (`handle` / `events` / `health()` / `faults()` / `ping()` and so on); `obs_collector` exposes platform operations only.

For service semantics and operational caveats see [Platform Services](../../../usage/services.md).

## API Overview

Platform operations shared by the service handles:

| Name | Kind | Description |
|------|------|-------------|
| `start` / `stop` / `restart` | Command | Request the target process state; control timeout is `CONTROL_TIMEOUT_MS` (25000 ms). |
| `state` | Command | Read the process state snapshot `ServiceState`. |
| `is_running` | Command | Running check (same as `state().is_running`). |
| `get_config` | Command | Read the service config (typed dataclass). |
| `set_config` | Command | CAS-commit the config; raises `ConfigurationConflict`. |
| `edit_config` | Context manager | Read-modify-write, committing only changed domains on exit. |

Config is split into domains: `ros2` has only `node` and `obs_collector` only `obs`. Service-specific methods are in the respective chapter.

## Methods

Signatures below are authoritative for names and defaults. Fields use snake_case; the generated types also accept the camelCase alias.

### start / stop / restart

Request the target process state. All three return `None`.

```python
robot.services.<name>.start() -> None
robot.services.<name>.stop() -> None
robot.services.<name>.restart() -> None
```

Control calls are synchronous: they submit the desired state and raise `FabotError` when the request fails. Process transitions are asynchronous, so confirm with `state()` / `is_running()` after the call, or subscribe to `robot.events.service_state_changed`.

`CONTROL_TIMEOUT_MS` on the handle (currently `25000`) is the control-call timeout: the manager drains dependents on restart, which outlasts the default resolve timeout.

:::warning
`stop()` / `restart()` affect everything that depends on the service. While `ros2` restarts, all ROS 2 graph and action access through it is unavailable; while `obs_collector` restarts, observability data stops being persisted.
:::

### state / is_running

```python
robot.services.<name>.state() -> ServiceState
robot.services.<name>.is_running() -> bool
```

**Returns** `ServiceState`

| Field | Type | Description |
|-------|------|-------------|
| `service_id` | `str` | Service id (such as `fabot_ros2`) |
| `desired` | `ServiceDesiredState` | Desired state: `Unknown` / `Running` / `Stopped` |
| `state` | `ServiceRunState` | Observed state: `Unknown` / `Starting` / `Ready` / `Stopping` / `Stopped` / `Failed` |
| `pid` | `int` | Process id; `-1` when not running |
| `restart_count` | `int` | Cumulative restarts |
| `source_instance_id` | `str` | Source instance id |

Two convenience properties: `is_running` (`state` is `Starting` or `Ready`) and `is_ready` (`state` is `Ready`).

When the platform has no row for the service, `state()` returns a snapshot with `service_id` filled and everything else at defaults rather than raising.

### get_config / set_config / edit_config

```python
robot.services.<name>.get_config() -> <Config>
robot.services.<name>.set_config(config, *, only_domains=None) -> <Config>
robot.services.<name>.edit_config()  # context manager
```

**Parameters** (`set_config`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `config` | the service's config dataclass | (required) | Target config |
| `only_domains` | `set[str] \| None` | `None` | Commit only these domains; `None` means all |

`set_config()` commits with CAS and returns the freshly read config on success; it raises `ConfigurationConflict` when the service state conflicts. `edit_config()` is the simplest form:

```python
from fabot.errors import ConfigurationConflict

with robot.services.ros2.edit_config() as cfg:
    cfg.node.namespace = "/robot"
# only changed domains are committed on exit
```

The equivalent explicit form:

```python
cfg = robot.services.obs_collector.get_config()
cfg.obs.retention_days.log = 14       # enum fields accept strings
try:
    cfg = robot.services.obs_collector.set_config(cfg)
except ConfigurationConflict:
    cfg = robot.services.obs_collector.get_config()   # re-read, merge, retry
```

All config classes provide `to_yaml()` / `from_yaml(text)` / `field_options()` / `field_help()` / `field_labels()`. Read enum choices from `field_options()` rather than hard-coding them.

## Channels

Of the two services only `ros2` has a data channel (`messages()`), documented in the "Channels" section of [ros2.md](ros2.md).

## Events

**Service state transitions** arrive on the robot-wide event `robot.events.service_state_changed`, whose payload field is `service_state` (`ServiceState`):

```python
def on_service_state(event):
    st = event.service_state
    print(st.service_id, st.desired, st.state, st.is_running)

token = robot.events.service_state_changed.subscribe(on_service_state)
```

`robot.services.ros2` additionally has a slot-level entry `robot.services.ros2.events` (`fault_changed` / `lifecycle_changed` plus wildcard `subscribe()`). `obs_collector` has no `events`.

Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs such as `start()`.

## Exceptions

Service control and query failures raise `FabotError` subclasses: `Timeout`, `NotFound` for an unknown service, `InvalidArgument` for bad arguments and `ResourceConflict` for contention; a conflicting config commit raises `ConfigurationConflict`. See [Error Handling](../../../usage/errors.md) for the full hierarchy.

## Status

Process status comes from `state()` (`ServiceState`, fields above). `robot.services.ros2` also has `health()` (`SlotHealth`) and `lifecycle()` (`CapabilityLifecycleSnapshot`).

Config fields and defaults per service are in the respective chapter.

## Resources

A service's `start` / `stop` / `restart` are platform control commands and occupy no capability resource.

| Service | Resource | Policy | Occupied by |
|---------|----------|--------|-------------|
| `ros2` | `goal` | `queue` | `send_goal` |
| `obs_collector` | — | — | No Operations |

## Related

- Service concepts, lifecycle and config caveats: [Platform Services](../../../usage/services.md)
- Config-domain access and conflict retries: [Configuration](../../../usage/configuration.md)
- Runtime environment config: [ros2_environment.md](ros2_environment.md)
- Diagnostic codes: [Diagnostic Code Reference](../error-codes.md)
- Service behaviour under Mock: [Mock Testing](../../../usage/mock.md)
