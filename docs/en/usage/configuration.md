---
title: Configuration
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Configuration

Configuration has two levels: the **robot configuration** (slot bindings, `robot.configuration`) and **capability / skill config domains** (each entity's own parameters via `proxy.get_config()` and friends). Both use **CAS (Compare-And-Swap)**: the submission carries the expected revision and raises `ConfigurationConflict` when the robot has moved on (see [Error Handling](errors.md)).

## Who owns what

| Level | Entry | Scope |
|-------|-------|-------|
| Robot | `robot.configuration.get()` / `apply()` | Which adapter each slot binds, enabled / essential flags, deployment node |
| Capability / skill | `robot.<slot>.get_config()` / `set_config()` / `edit_config()` | That entity's own parameter domains (arrival thresholds, camera streams, sync groups, …) |

Changing a capability parameter does not need a robot-wide patch; changing "which adapter lives in this slot" does.

## Robot configuration

```python
cfg = robot.configuration.get()     # RobotConfig snapshot
print(cfg.revision)
print(cfg.io.adapter_id)            # "fabot_io"
print(cfg.to_yaml())
```

Every slot on `RobotConfig` is a `SlotBinding` attribute (`cfg.io`, `cfg.left_arm`, `cfg.chassis`; the full 23 slots are listed in [Robot Entry](../reference/python/robot.md)).

### Changing bindings

Build a patch containing only your changes, then `apply()` it:

```python
from fabot.robot import RobotConfig
from fabot.adapters import IoConfig

patch = RobotConfig()                       # empty patch: untouched slots keep their state
patch.io.bind(IoConfig())                   # bind fabot_io with its config domains
patch.chassis.unbind()                      # unbind the chassis

new_cfg = robot.configuration.apply(patch)  # CAS commit; returns the new snapshot
```

`apply()` reads the latest configuration, merges only the slots the patch **touched** (`merge_touched`), then submits with the latest `revision`. A patch therefore only needs the changed parts.

`to_yaml()` rewrites only the `adapters` section and leaves every other top-level key (services, coordinate frames, …) untouched — a full replacement would stop services that were omitted.

:::note
Configurations from `from_yaml()` / `get()` are for inspection and backup; their slots do not count as "touched", so submitting them as a patch changes nothing. Use `bind()` / `unbind()` to modify.
:::

### Retrying conflicts

When several clients change configuration concurrently, the loser gets `ConfigurationConflict`. Since `apply()` always merges against the latest configuration, retrying is enough:

```python
from fabot.errors import ConfigurationConflict

for _ in range(3):
    try:
        robot.configuration.apply(patch)
        break
    except ConfigurationConflict:
        continue
```

### SlotBinding

| Method | Description |
|--------|-------------|
| `bind(config, *, required=None, node_id=None, enabled=None)` | Bind an adapter from its config class or instance; optionally set `required` / `node_id` / `enabled` |
| `unbind()` | Unbind the slot |
| `to_mapping()` | Export as a dict; `None` when unbound |
| `domain_updates()` | Collect the config-domain documents for this slot |

Binding changes trigger lifecycle transitions (see [Status, Faults & Lifecycle](status-faults.md)) and can be observed via `robot.events.registry_changed` and `robot.events.config_changed` (see [Events & Data Channels](events-channels.md)).

### RobotConfig helpers

| Method | Description |
|--------|-------------|
| `to_yaml()` / `from_yaml(text, revision=None)` | Export / import YAML (`api_version: fabot/v1`) for backup and migration |
| `from_state(state)` | Build from an internal snapshot; used by `get()` |
| `merge_touched(patch)` | Merge the patch's touched slots into the current config; used by `apply()` |

Exported YAML looks like:

```yaml
api_version: fabot/v1
adapters:
  - slot: io
    adapter: fabot_io
  - slot: chassis
    adapter: fabot_chassis
    enabled: false
```

## Capability config domains

Each adapter's config domain is a typed dataclass under `fabot.adapters` (with `to_yaml()` / `from_yaml()` / `field_options()`). Slot proxies expose three methods:

| Method | Description |
|--------|-------------|
| `get_config()` | Read the slot's bound config domains as a typed dataclass |
| `set_config(config)` | Submit only this slot's domains; other slots and top-level keys stay put. Returns the latest config |
| `edit_config()` | Context manager: read on entry, submit the **changed domains** on exit |

`edit_config()` is the least error-prone form because it submits only what actually changed:

```python
with robot.left_arm.edit_config() as conf:
    conf.arrival.joint_tolerance = 0.01
# the arrival domain is committed on exit
```

The explicit equivalent:

```python
conf = robot.left_arm.get_config()
conf.arrival.max_timeout_s = 8.0
robot.left_arm.set_config(conf)
```

`get_config()` raises `AdapterUnbound` when the slot has no adapter, and `RuntimeError` when no config type is registered for the adapter.

Skills (`robot.skills.*`) use the same three methods for their own domains, see [Skills & Extensions](skills.md).

## Platform service configuration

Services are configured through `robot.services` with `get_config()` / `set_config()`, see [Platform Services](services.md).
