---
title: Configuration Retry
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Configuration Retry

Read and modify robot configuration, retrying on concurrent conflicts. CAS mechanics plus the `RobotConfig` / `SlotBinding` shape are in [Configuration](../../usage/configuration.md); error types in [Error Handling](../../usage/errors.md).

## Robot bindings: patch plus retry

The flow: build a `RobotConfig` patch with only your changes → mark changes with `bind()` / `unbind()` → `apply()`. `apply()` re-reads the current `revision` and merges only the touched slots; if another client changed the revision in between, it raises `ConfigurationConflict`, so simply resubmit.

```python
from fabot import Robot
from fabot.adapters import IoConfig
from fabot.errors import ConfigurationConflict
from fabot.robot import RobotConfig

with Robot.connect("192.168.1.10", 7557) as robot:
    patch = RobotConfig()
    patch.io.bind(IoConfig())

    for attempt in range(3):
        try:
            cfg = robot.configuration.apply(patch)
            print("applied, revision =", cfg.revision)
            break
        except ConfigurationConflict as err:
            print("conflict, retrying", attempt, err)
    else:
        raise RuntimeError("configuration conflicted three times")
```

## Capability domains: change one domain

Capability parameters do not need a robot-wide patch; read and write that slot's config domains directly. `edit_config()` is a context manager: it reads on entry and submits only the **changed domains** on exit.

```python
with robot.left_arm.edit_config() as conf:
    conf.arrival.joint_tolerance = 0.01
    conf.arrival.max_timeout_s = 8.0
# the arrival domain is committed on exit
```

The explicit equivalent, useful when you want to drive retries yourself:

```python
from fabot.errors import ConfigurationConflict

for attempt in range(3):
    conf = robot.left_arm.get_config()
    conf.arrival.joint_tolerance = 0.01
    try:
        robot.left_arm.set_config(conf)
        break
    except ConfigurationConflict:
        print("conflict, retrying", attempt)
```

## Service configuration

Platform service config uses the same CAS pattern:

```python
svc = robot.services.ocs2
for attempt in range(3):
    cfg = svc.get_config()
    cfg.launch.hardware = "real"
    try:
        cfg = svc.set_config(cfg)
        break
    except ConfigurationConflict:
        print("conflict, retrying", attempt)
```

Enum fields accept strings (`"real"`), and `Ocs2Config.field_options()` gives the legal values for building a dropdown.

## Backup and migration

`to_yaml()` / `from_yaml()` export and import the robot configuration; the exported YAML can be diffed or archived:

```python
yaml_text = robot.configuration.get().to_yaml()
open("robot_config.backup.yaml", "w").write(yaml_text)

# Restoring from a backup (note: slots from from_yaml are not "touched",
# so you must bind explicitly for changes to take effect)
# from fabot.robot import RobotConfig
# restored = RobotConfig.from_yaml(open("robot_config.backup.yaml").read())
```
