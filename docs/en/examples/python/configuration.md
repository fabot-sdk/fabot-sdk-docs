---
title: Configuration Retry
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Configuration Retry

Read and modify the robot configuration, retrying on concurrent conflicts. See [Configuration](../../usage/configuration.md) for the CAS mechanism and the `RobotConfig` / `SlotBinding` structure, and [Errors](../../usage/errors.md) for the error types.

The flow: `get()` returns a `RobotConfig` carrying a `revision` → call `bind()` to mark the slot you want to change as touched and fill in the new config → commit with `apply()`. Internally, `apply()` re-reads the current `revision` and merges only the touched slots; if the `revision` was changed by another client before the commit, it raises `ConfigurationConflict` — re-`get()` and retry.

```python
from fabot import Robot
from fabot.adapters import FabotIoConfig
from fabot.errors import ConfigurationConflict

with Robot.connect("192.168.1.10", 7557) as robot:
    for _ in range(3):
        cfg = robot.configuration.get()               # RobotConfig, including revision

        io_cfg = cfg.io.config or FabotIoConfig()     # current config of the io slot
        io_cfg.channels.digital.relay1.pin = 7        # edit a config-domain field
        cfg.io.bind(io_cfg)                           # mark this slot as modified

        try:
            cfg = robot.configuration.apply(cfg)      # CAS commit, returns new config
            print("applied, revision:", cfg.revision)
            break
        except ConfigurationConflict as exc:
            print("conflict, retrying:", exc)         # re-read and retry
    else:
        raise RuntimeError("apply failed after 3 retries")
```

- Only slots touched via `bind()` / `unbind()` are merged and committed by `apply()`; editing fields without calling `bind()` has no effect.
- `cfg.io.config` is a typed config instance (the Config classes of each adapter under `fabot.adapters`, supporting `to_yaml` / `from_yaml`); it is `None` when the slot has no adapter bound.
- Use `RobotConfig.to_yaml()` / `RobotConfig.from_yaml()` to export / import the whole configuration; to read just one adapter's full config domain you can also use the `as_adapter` view — see [Configuration](../../usage/configuration.md).
- Platform services are configured through a separate entry point; see [Platform Services](../../usage/services.md).
