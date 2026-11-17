---
title: Platform Services
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Platform Services

Platform services expose only a **small set of platform operations** to the SDK: start / stop / restart, state queries and config access. Business APIs are not open to clients. Only services declared client-visible show up in `robot.services`.

## Entries and services

`robot.services` exposes a handle per client-visible service, by short name:

| Property | service id | Handle | Config type |
|----------|-----------|--------|-------------|
| `robot.services.ros2` | `fabot_ros2` | `Ros2ServiceHandle` | `Ros2Config` |
| `robot.services.obs_collector` | `fabot_obs_collector` | `ObsCollectorServiceHandle` | `ObsCollectorConfig` |

The `SERVICE_ID` / `CONFIG` class attributes on each handle give the service id and config type.

- `ros2` is the ROS 2 graph-access service: alongside the usual lifecycle and config operations it exposes node / topic / service / action / parameter queries and calls, see "ROS 2 graph access" below.
- `obs_collector` is the observability collector that persists logs / metrics / events and owns the flight recorder, see "Observability collector" below.

## Platform operations

| Operation | Description |
|-----------|-------------|
| `start()` / `stop()` / `restart()` | Lifecycle control |
| `state()` | `ServiceState` snapshot |
| `is_running()` | Running check (same as `state().is_running`) |
| `get_config()` / `set_config(cfg)` | Read / CAS-update the service config (raises `ConfigurationConflict`) |

```python
svc = robot.services.ros2                # Ros2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # typed config dataclass
svc.set_config(cfg)                     # CAS; raises ConfigurationConflict
```

## Lifecycle control

`start()` / `stop()` / `restart()` are synchronous: they submit the desired state and raise `FabotError` when the request fails (see [Error Handling](errors.md)). Process transitions are asynchronous, so confirm with `state()` / `is_running()` after the call, or subscribe to `service_state_changed`.

:::warning
`stop()` / `restart()` affect everything that depends on the service. While `ros2` restarts, all ROS 2 graph and action access through it is unavailable; while `obs_collector` restarts, observability data stops being persisted.
:::

## State query

`state()` returns `ServiceState`:

| Field | Type | Description |
|-------|------|-------------|
| `service_id` | `str` | Service id (such as `fabot_ros2`) |
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

svc = robot.services.obs_collector
cfg = svc.get_config()
print(cfg.to_yaml())                    # the effective obs config

cfg.obs.retention_days.log = 14         # strongly typed; enum fields accept strings
try:
    cfg = svc.set_config(cfg)           # CAS; returns the latest config
except ConfigurationConflict:
    cfg = svc.get_config()              # re-read, merge, retry
```

`ObsCollectorConfig.field_options()` lists the legal values per field, which is convenient for building dropdowns. Treat the returned tuples as the source of truth — enums are added and removed between releases, so do not hard-code candidate lists. The retry pattern is the same as for robot configuration, see [Configuration](configuration.md).

`obs_collector` reads its config only at start: after saving, call `stop()` then `start()` for it to take effect.

## ROS 2 graph access

`robot.services.ros2` bridges the local ROS 2 graph. Query methods are short Commands reading a server-side cache; `wait_ms` is how long to wait for the graph to converge (milliseconds):

```python
svc = robot.services.ros2
print(svc.list_nodes(include_hidden=False, wait_ms=500))
print(svc.list_topics(include_hidden=False, wait_ms=500))
print(svc.topic_info(name="/scan", include_hidden=False, wait_ms=500))
print(svc.list_parameters(node="/controller_manager", include_hidden=False, wait_ms=500))
```

| Method | Description |
|--------|-------------|
| `list_nodes` / `node_info` | List nodes / read one node |
| `list_topics` / `topic_info` | List topics / read one topic's endpoints and type |
| `list_services` / `service_type` | List services / query a service type name |
| `list_actions` | List actions |
| `call_service(name, message_type, payload)` | Call a service; `payload` is a JSON string and the result is a JSON string |
| `publish(name, message_type, payload)` | Publish one message |
| `subscribe(name, message_type, reliability, depth)` / `unsubscribe(subscription_id)` | Subscribe to a topic; subsequent messages arrive through the `robot.services.ros2.messages()` channel |
| `get_parameter` / `set_parameter` / `list_parameters` | Node parameter access (values are JSON strings too) |
| `send_goal(...)` | Send an action goal, returns `SendGoalOperation` |
| `listen(name, message_type, reliability=0, depth=10)` | Open a message channel for received messages |

Short Commands default to 3000 ms; `call_service` / `publish` / `send_goal` require `timeout_ms`, and `set_parameter` defaults to 10000 ms. Everything crosses the boundary as JSON strings — do not assume Python objects for specific message types.

`Ros2Config` has a single `node` domain (`node_name` / `namespace`). The ROS 2 domain id lives in `robot.environments.ros2`, not in service config.

## Observability collector

`robot.services.obs_collector` manages how observability data lands on disk: quota, per-kind size and retention, and the freeze window.

```python
svc = robot.services.obs_collector
cfg = svc.get_config()
print(cfg.obs.quota_percent, cfg.obs.retention_days.log)
print(svc.state())
```

Main fields of `ObsCollectorConfig.obs`:

| Field | Description |
|-------|-------------|
| `quota_percent` | Partition quota ceiling (percent) |
| `max_size_mb.log` / `metric` / `event` | Per-file size ceiling per kind |
| `retention_days.log` / `metric` / `freeze` / `event` | Retention in days per kind |
| `freeze_pre_sec` / `freeze_post_sec` / `freeze_cooldown_sec` | Freeze snapshot window and cooldown |
| `maintenance_interval_sec` | Cleanup interval |
| `queue_capacity` | Write-queue length |
| `flight_recorder_mb` / `max_frame_kb` | Flight-recorder memory budget and per-frame cap |

To inspect current disk usage and existing freeze files, use `robot.obs.store()`, see [Logs, Metrics & Observability](observability.md).

## Runtime environment configuration

`robot.environments` reads and writes runtime environment config; currently only `ros2`. It differs from `robot.services.ros2`: the former is **configuration** (domain id, localhost-only, router), the latter is a **process**.

```python
env = robot.environments.ros2
print(env.get_config().communication.domain_id)

cfg = env.get_config()
cfg.communication.domain_id = 42
env.set_config(cfg)                     # CAS; raises ConfigurationConflict
```

`Ros2EnvironmentHandle` only offers `get_config()` / `set_config()` / `edit_config()`; there is no `start()` / `stop()`.

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

## Related

- Service API reference (signatures, `ros2` graph and action APIs, config fields): [Platform Services Overview](../reference/python/services/index.md)
- Config-domain access and conflict retries: [Configuration](configuration.md)
- Service state events and subscription conventions: [Events & Data Channels](events-channels.md)
