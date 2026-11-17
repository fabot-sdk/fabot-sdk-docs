---
title: Runtime Environment Ros2Environment
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Runtime Environment Ros2Environment

## Module Overview

- Entry: `robot.environments.ros2`
- environment id: `fabot_env_ros2`; handle `Ros2EnvironmentHandle`; config type `Ros2EnvironmentConfig`
- **Configuration** of the robot runtime environment, not a process: it covers the domain id, loopback-only mode and router ownership.
- Unlike the [ROS 2 service](ros2.md), this is **config** (ROS 2 graph identity) while that is a **process** (graph access service). The domain id is not in the service config.
- No `start()` / `stop()`; only `get_config()` / `set_config()` / `edit_config()`.

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `get_config` | Command | Read `Ros2EnvironmentConfig`. |
| `set_config` | Command | CAS commit; raises `ConfigurationConflict`. |
| `edit_config` | Context manager | Read-modify-write, committing only changed domains on exit. |

The `ENVIRONMENT_ID` / `CONFIG` class attributes give the environment id and config type.

## Methods

### get_config / set_config

```python
get_config() -> Ros2EnvironmentConfig
set_config(config: Ros2EnvironmentConfig, *, only_domains=None) -> Ros2EnvironmentConfig
```

**Parameters** (`set_config`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `Ros2EnvironmentConfig` | (required) | Target config |
| `only_domains` | `set[str] \| None` | `None` | Commit only these domains; `None` means all |

```python
env = robot.environments.ros2
print(env.get_config().communication.domain_id)

cfg = env.get_config()
cfg.communication.domain_id = 42
env.set_config(cfg)
```

### edit_config

```python
with robot.environments.ros2.edit_config() as cfg:
    cfg.communication.localhost_only = True
# only the communication domain is committed on exit
```

The environment config is read at process start, so a change restarts every running unit that inherits it.

## Channels

The entry has no data channels.

## Events

No event entry. Config changes can be observed through the robot-wide `robot.events.config_changed`, see [Events & Data Channels](../../../usage/events-channels.md).

## Exceptions

A CAS clash raises `ConfigurationConflict` (see [Error Handling](../../../usage/errors.md)); retry patterns match capability and service config, see [Configuration](../../../usage/configuration.md).

## Status

`Ros2EnvironmentConfig` has a single `communication` domain:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `domain_id` | `int` | `0` | `ROS_DOMAIN_ID`, range 0–232; only nodes in the same domain discover each other |
| `localhost_only` | `bool` | `False` | `ROS_LOCALHOST_ONLY`; when on, discovery and traffic stay on loopback and never cross subnets |
| `router` | `CommunicationRouter` | `owned` | `owned` starts the router here and moves to the next free port if taken; `attach` does not start one and connects to the existing `tcp/localhost:7447`; a missing key means `owned` |

The RMW stays `rmw_zenoh_cpp` and is not configurable.

## Resources

The entry has no Operations and occupies no capability resource.

## Config domains

The domain is `communication`. `field_options()` / `field_help()` / `field_labels()` give legal values and description text.

## Related

- Overall service and environment guidance: [Platform Services](../../../usage/services.md)
- ROS 2 graph access service: [ros2.md](ros2.md)
- Config-domain access: [Configuration](../../../usage/configuration.md)
