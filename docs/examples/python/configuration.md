---
title: 配置重试
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 配置重试

修改配置（带冲突重试）。机制见 [配置管理](../../usage/configuration.md)。

```python
from fabot import Robot
from fabot.errors import ConfigurationConflict

with Robot.connect("192.168.1.10", 7557) as robot:
    for _ in range(3):
        cfg = robot.configuration.get()
        patch = cfg.from_state()
        # ... 编辑 patch ...
        try:
            robot.configuration.apply(patch)
            break
        except ConfigurationConflict:
            continue   # 重新读取后重试
```
