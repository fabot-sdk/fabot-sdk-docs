---
title: 配置重试
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 配置重试

读取并修改机器人配置，遇到并发冲突时重试。CAS 机制与 `RobotConfig` / `SlotBinding` 结构见 [配置管理](../../usage/configuration.md)，错误类型见 [错误处理](../../usage/errors.md)。

修改流程：`get()` 拿到带 `revision` 的 `RobotConfig` → 用 `bind()` 把要改的槽位标记为已修改并填入新配置 → `apply()` 提交。`apply()` 内部会重新读取当前 `revision`、只合并触碰过的槽位；提交期间 `revision` 被其他客户端改动时抛 `ConfigurationConflict`，重新 `get()` 后再试。

```python
from fabot import Robot
from fabot.adapters import FabotIoConfig
from fabot.errors import ConfigurationConflict

with Robot.connect("192.168.1.10", 7557) as robot:
    for _ in range(3):
        cfg = robot.configuration.get()               # RobotConfig，含 revision

        io_cfg = cfg.io.config or FabotIoConfig()     # io 槽位当前配置
        io_cfg.channels.digital.relay1.pin = 7        # 修改配置域字段
        cfg.io.bind(io_cfg)                           # 标记该槽位为已修改

        try:
            cfg = robot.configuration.apply(cfg)      # CAS 提交，返回新配置
            print("applied, revision:", cfg.revision)
            break
        except ConfigurationConflict as exc:
            print("conflict, retrying:", exc)         # 重新读取后重试
    else:
        raise RuntimeError("apply failed after 3 retries")
```

- 只有经 `bind()` / `unbind()` 触碰过的槽位才会被 `apply()` 合并提交；直接改字段但不 `bind()` 不会生效。
- `cfg.io.config` 是强类型配置实例（`fabot.adapters` 下各 adapter 的 Config 类，支持 `to_yaml` / `from_yaml`）；槽位未绑定 adapter 时为 `None`。
- 导出 / 导入整份配置用 `RobotConfig.to_yaml()` / `RobotConfig.from_yaml()`；只读某个 adapter 的完整配置域也可用 `as_adapter` 视图，见 [配置管理](../../usage/configuration.md)。
- 平台服务的配置走另一组入口，见 [平台服务管理](../../usage/services.md)。
