---
title: Observability Collector ObsCollector
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Observability Collector ObsCollector

## Module Overview

- Service: `obs_collector`; entry: `robot.services.obs_collector`
- service id: `fabot_obs_collector`; handle `ObsCollectorServiceHandle`; config type `ObsCollectorConfig`
- Observability collector: persists logs / metrics / events and owns the flight recorder. Its config covers quota, per-category size and retention, and the freeze window.
- **The process reads this config only at start**: after `set_config()`, call `stop()` then `start()` for it to take effect.
- For current disk usage and the freeze file list use `robot.obs.store()`, see [Logs, Metrics & Observability](../../../usage/diagnostics/observability.md).

Shared platform operations (`start` / `state` / `get_config`, CAS conflicts and so on) are in the [Platform Services Overview](./index.md).

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `start` / `stop` / `restart` | Command | Lifecycle control; control timeout 25000 ms. |
| `state` | Command | `ServiceState` snapshot. |
| `is_running` | Command | Running check. |
| `get_config` | Command | Read `ObsCollectorConfig`. |
| `set_config` | Command | CAS commit; raises `ConfigurationConflict`. |
| `edit_config` | Context manager | Read-modify-write. |

## Methods

### Read and commit config

```python
svc = robot.services.obs_collector
cfg = svc.get_config()
print(cfg.obs.quota_percent, cfg.obs.retention_days.log, cfg.obs.flight_recorder_mb)
```

```python
with svc.edit_config() as cfg:
    cfg.obs.retention_days.log = 14
svc.stop()
svc.start()
```

Config takes effect only after a restart; under `Robot.mock()` control operations merely succeed without changing real behaviour.

## Channels

The service has no data channels. Read logs and metrics through `robot.logs` / `robot.metrics`, see [Logs, Metrics & Observability](../../../usage/diagnostics/observability.md).

## Events

No service-private events; state transitions arrive on the robot-wide `robot.events.service_state_changed`, see the [Platform Services Overview](./index.md). Freezing observability is triggered by `robot.freeze()` or `robot.logs.freeze()`.

## Exceptions

Same as the other services: control failures raise `FabotError` and config clashes raise `ConfigurationConflict`. Out-of-range values (such as a `quota_percent` of zero or less) are rejected or fall back to defaults when applied; see the per-field notes. See [Error Handling](../../../usage/diagnostics/errors.md).

## Status

`state()` returns `ServiceState` (fields in the [Platform Services Overview](./index.md)).

`ObsCollectorConfig` has a single `obs` domain:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `quota_percent` | `int` | `20` | Max share of the data-root partition the observability data may occupy, must be > 0; the maintenance cycle cleans up beyond it |
| `max_size_mb` | `ObsMaxSizeMbConfig` | `log=50` / `metric=50` / `event=20` | Per-category rotation threshold in MiB |
| `retention_days` | `ObsRetentionDaysConfig` | `log=7` / `metric=14` / `freeze=14` / `event=30` | Retention in days per category |
| `freeze_pre_sec` | `int` | `10` | Flight-recorder history kept before a freeze, in seconds |
| `freeze_post_sec` | `int` | `2` | Time kept after a freeze, in seconds |
| `freeze_cooldown_sec` | `int` | `60` | Minimum interval between freezes for the same `(code, source)`, in seconds |
| `maintenance_interval_sec` | `int` | `600` | Retention and quota cleanup period in seconds, must be > 0 |
| `queue_capacity` | `int` | `8192` | Bounded ingest queue length; when full it drops DEBUG/INFO logs, then metrics, then WARN/ERROR logs, and a configured `0` falls back to 8192 at start |
| `flight_recorder_mb` | `int` | `16` | Total ring-buffer budget of the flight recorder in MiB |
| `max_frame_kb` | `int` | `64` | Max accepted length of one frame in KiB; longer records are dropped |

The data root is fixed and not a config field. Some fields can be overridden by environment variables (quota, freeze window and cooldown, maintenance period).

## Resources

The service has no Operations and occupies no capability resource.

## Config domains

The domain is `obs`; `edit_config()` commits only the domains that actually changed. `field_help()` gives per-field descriptions in Chinese and English and `field_labels()` gives display names, ready for a config UI.

## Related

- Logs, metrics and the observability store: [Logs, Metrics & Observability](../../../usage/diagnostics/observability.md)
- Service concepts and lifecycle caveats: [Platform Services](../../../usage/configuration/services.md)
- Config-domain access: [Configuration](../../../usage/configuration/configuration.md)
