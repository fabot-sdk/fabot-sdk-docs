---
title: 配置管理
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 配置管理

机器人配置（槽位绑定、能力配置域等）通过 `robot.configuration` 读取与修改，修改采用 **CAS（Compare-And-Swap）**：携带期望的 `revision`，冲突时抛 `ConfigurationConflict`（code 81001）。

## 读取与修改

```python
cfg = robot.configuration.get()          # RobotConfig，含 revision
print(cfg.to_yaml())

patch = cfg.from_state()                  # 基于当前状态构造修改
# ... 编辑 patch ...
new_cfg = robot.configuration.apply(patch)   # CAS 提交；冲突抛 ConfigurationConflict
```

冲突时的典型处理：重新 `get()` → 合并自己的修改（`merge_touched` 可只合并触碰过的域）→ 重试 `apply()`。

## 槽位绑定

`SlotBinding` 描述槽位与 adapter 的绑定关系，支持 `bind` / `unbind` / `to_mapping` / `domain_updates`。改绑定会触发对应能力的生命周期迁移（见 [状态、故障与生命周期](status-faults.md)），可通过 `robot.events.registry_changed` 观察。

## RobotConfig 工具方法

`to_yaml` / `from_yaml`（导出导入 YAML）、`from_state`（从当前状态构造）、`merge_touched`（合并触碰域）。

## 能力配置（adapter 强类型）

需要读写某个 adapter 的完整配置域时，使用 `fabot.adapters` 下的强类型视图：

```python
from fabot.adapters import FabotIo

io = robot.io.as_adapter(FabotIo)
conf = io.get_config()          # FabotIoConfig dataclass，支持 to_yaml / from_yaml
```

!!! note
    平台服务（service）的配置走另一组入口，见 [平台服务管理](services.md)。
