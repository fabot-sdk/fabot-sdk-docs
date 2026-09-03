---
title: Configuration Retry
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Configuration Retry

Modify configuration with conflict retry. See [Configuration](../../usage/configuration.md) for the mechanism.

```python
from fabot import Robot
from fabot.errors import ConfigurationConflict

with Robot.connect("192.168.1.10", 7557) as robot:
    for _ in range(3):
        cfg = robot.configuration.get()
        patch = cfg.from_state()
        # ... edit patch ...
        try:
            robot.configuration.apply(patch)
            break
        except ConfigurationConflict:
            continue   # re-read and retry
```
