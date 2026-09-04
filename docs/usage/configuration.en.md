---
title: Configuration
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Configuration

The whole-robot configuration (slot bindings and per-capability configuration domains) is read and modified via `robot.configuration`. Modifications use **CAS (Compare-And-Swap)**: the commit carries the expected `revision`, and a conflict with the robot's current configuration raises `ConfigurationConflict` (see [Error Handling](errors.md) for the error hierarchy).

## Reading Configuration

```python
cfg = robot.configuration.get()     # RobotConfig snapshot
print(cfg.revision)                 # configuration revision
print(cfg.io.adapter_id)            # "fabot_io"
print(cfg.to_yaml())                # export as YAML
```

Each slot on `RobotConfig` is a `SlotBinding` attribute (e.g. `cfg.io`, `cfg.left_arm`, `cfg.chassis`; see [Overview](../overview.md) for all 22 slots).

## Modifying Configuration

Build a patch that describes only the changes, then commit it with `apply()`:

```python
from fabot.robot import RobotConfig
from fabot.adapters import FabotIoConfig

patch = RobotConfig()                       # empty patch: untouched slots stay as-is
patch.io.bind(FabotIoConfig())              # bind fabot_io and write its config
patch.chassis.unbind()                      # unbind the chassis

new_cfg = robot.configuration.apply(patch)  # CAS commit; returns the applied snapshot
```

`apply()` internally reads the latest configuration, merges the **touched slots** from the patch into it (`merge_touched`), and commits with the latest `revision` — so a patch only needs to contain the parts you want to change.

!!! note
    Configurations from `from_yaml()` / `get()` are for inspection and backup; their slots are not "touched", so submitting one directly as a patch changes nothing. Use `bind()` / `unbind()` to make changes.

## Conflict Retry

When multiple clients modify the configuration concurrently, the conflicting side gets `ConfigurationConflict` (code 81001; 81002 if the configuration was rewritten during the commit). Since `apply()` always merges against the latest configuration, simply retry:

```python
from fabot.errors import ConfigurationConflict

for _ in range(3):
    try:
        robot.configuration.apply(patch)
        break
    except ConfigurationConflict:
        continue
```

## Slot Bindings (SlotBinding)

| Method | Description |
|------|------|
| `bind(config, *, required=None, node_id=None, enabled=None)` | Bind an adapter; `config` is its config class or instance, with optional `required` / `node_id` / `enabled` |
| `unbind()` | Unbind the slot |
| `to_mapping()` | Export as a dict; returns `None` when unbound |
| `domain_updates()` | Collect the touched config-domain documents of the slot |

Changing a binding triggers a lifecycle transition of the corresponding capability (see [Status, Faults & Lifecycle](status-faults.md)), observable via `robot.events.registry_changed` and `robot.events.config_changed` (see [Events & Channels](events-channels.md)).

## RobotConfig Utility Methods

| Method | Description |
|------|------|
| `to_yaml()` / `from_yaml(text, revision=None)` | Export / import YAML (`api_version: fabot/v1`), for backup and migration |
| `from_state(state)` | Build from an internal snapshot; normally used by `get()` |
| `merge_touched(patch)` | Merge the touched slots of a patch into the current configuration; used internally by `apply()` |

The exported YAML looks like:

```yaml
api_version: fabot/v1
adapters:
  - slot: io
    adapter: fabot_io
  - slot: chassis
    adapter: fabot_chassis
    enabled: false
```

## Capability Configuration Domains (Typed per Adapter)

Each adapter's configuration domain maps to a typed dataclass (under `fabot.adapters`, supporting `to_yaml` / `from_yaml`). Reading:

```python
cfg = robot.configuration.get()
io_conf = cfg.io.config          # FabotIoConfig; None if the slot is unbound or the adapter is unknown
```

Modifying: edit the dataclass, then submit it via `bind()` in a patch:

```python
from fabot.robot import RobotConfig

io_conf.channels.digital.relay1.pin = 5
patch = RobotConfig()
patch.io.bind(io_conf)
robot.configuration.apply(patch)
```

!!! note
    Platform services are configured through `get_config()` / `set_config()` on `robot.services`; see [Platform Services](services.md).
