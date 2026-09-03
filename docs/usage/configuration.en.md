---
title: Configuration
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Configuration

Robot configuration (slot bindings, capability configuration domains, etc.) is read and modified via `robot.configuration`. Modifications use **CAS (Compare-And-Swap)**: they carry the expected `revision`, and a conflict raises `ConfigurationConflict` (code 81001).

## Reading & Modifying

```python
cfg = robot.configuration.get()          # RobotConfig, including revision
print(cfg.to_yaml())

patch = cfg.from_state()                  # build a modification based on the current state
# ... edit patch ...
new_cfg = robot.configuration.apply(patch)   # CAS commit; conflicts raise ConfigurationConflict
```

Typical conflict handling: re-`get()` → merge your changes (`merge_touched` merges only the touched domains) → retry `apply()`.

## Slot Bindings

`SlotBinding` describes the binding between a slot and an adapter, supporting `bind` / `unbind` / `to_mapping` / `domain_updates`. Changing a binding triggers a lifecycle transition of the corresponding capability (see [Status, Faults & Lifecycle](status-faults.md)), observable via `robot.events.registry_changed`.

## RobotConfig Utility Methods

`to_yaml` / `from_yaml` (export/import YAML), `from_state` (build from current state), `merge_touched` (merge touched domains).

## Capability Configuration (Typed per Adapter)

When you need to read/write the full configuration domain of a specific adapter, use the typed views under `fabot.adapters`:

```python
from fabot.adapters import FabotIo

io = robot.io.as_adapter(FabotIo)
conf = io.get_config()          # FabotIoConfig dataclass, supports to_yaml / from_yaml
```

!!! note
    Platform services use a separate set of entries for configuration; see [Platform Services](services.md).
