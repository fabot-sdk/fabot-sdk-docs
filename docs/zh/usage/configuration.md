---
title: 配置管理
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 配置管理

整机配置（槽位绑定与各能力的配置域）通过 `robot.configuration` 读取与修改。修改采用 **CAS（Compare-And-Swap）**：提交时携带期望的 `revision`，与机器人当前配置冲突时抛 `ConfigurationConflict`（错误层次见 [错误处理](errors.md)）。

## 读取配置

```python
cfg = robot.configuration.get()     # RobotConfig 快照
print(cfg.revision)                 # 配置版本号
print(cfg.io.adapter_id)            # "fabot_io"
print(cfg.to_yaml())                # 导出为 YAML
```

`RobotConfig` 上每个槽位是一个 `SlotBinding` 属性（如 `cfg.io`、`cfg.left_arm`、`cfg.chassis`；全部 22 个槽位见 [概览](../overview.md)）。

## 修改配置

构造一个只描述改动的补丁，再 `apply()` 提交：

```python
from fabot.robot import RobotConfig
from fabot.adapters import FabotIoConfig

patch = RobotConfig()                       # 空补丁：未触碰的槽位保持现状
patch.io.bind(FabotIoConfig())              # 绑定 fabot_io 并写入其配置
patch.chassis.unbind()                      # 解绑底盘

new_cfg = robot.configuration.apply(patch)  # CAS 提交，返回应用后的新快照
```

`apply()` 内部会先读取最新配置、把补丁中**触碰过的槽位**合并进去（`merge_touched`），再带着最新 `revision` 提交，因此补丁只需包含要改的部分。

:::note
`from_yaml()` / `get()` 得到的配置用于查看与备份；其中槽位不算「触碰」，直接当补丁提交不会产生任何改动。要修改请用 `bind()` / `unbind()`。
:::

## 冲突重试

多个客户端同时改配置时，冲突方会收到 `ConfigurationConflict`（code 81001；提交期间配置被改写则为 81002）。`apply()` 每次都基于最新配置合并，直接重试即可：

```python
from fabot.errors import ConfigurationConflict

for _ in range(3):
    try:
        robot.configuration.apply(patch)
        break
    except ConfigurationConflict:
        continue
```

## 槽位绑定（SlotBinding）

| 方法 | 说明 |
|------|------|
| `bind(config, *, required=None, node_id=None, enabled=None)` | 绑定 adapter，`config` 为其配置类或实例；可选设置 `required` / `node_id` / `enabled` |
| `unbind()` | 解绑槽位 |
| `to_mapping()` | 导出为字典；未绑定时返回 `None` |
| `domain_updates()` | 取出该槽位被触碰的配置域文档 |

改动绑定会触发对应能力的生命周期迁移（见 [状态、故障与生命周期](status-faults.md)），可通过 `robot.events.registry_changed` 与 `robot.events.config_changed` 观察（见 [事件与数据通道](events-channels.md)）。

## RobotConfig 工具方法

| 方法 | 说明 |
|------|------|
| `to_yaml()` / `from_yaml(text, revision=None)` | 导出 / 导入 YAML（`api_version: fabot/v1`），用于备份与迁移 |
| `from_state(state)` | 由内部快照构造，一般由 `get()` 使用 |
| `merge_touched(patch)` | 把补丁中触碰过的槽位合并到当前配置，`apply()` 内部使用 |

导出的 YAML 形如：

```yaml
api_version: fabot/v1
adapters:
  - slot: io
    adapter: fabot_io
  - slot: chassis
    adapter: fabot_chassis
    enabled: false
```

## 能力配置域（adapter 强类型）

每个 adapter 的配置域对应一个强类型 dataclass（`fabot.adapters` 下，支持 `to_yaml` / `from_yaml`）。读取：

```python
cfg = robot.configuration.get()
io_conf = cfg.io.config          # FabotIoConfig；槽位未绑定或 adapter 未知时为 None
```

修改：编辑 dataclass 后经 `bind()` 随补丁提交：

```python
from fabot.robot import RobotConfig

io_conf.channels.digital.relay1.pin = 5
patch = RobotConfig()
patch.io.bind(io_conf)
robot.configuration.apply(patch)
```

:::note
平台服务（service）的配置走 `robot.services` 的 `get_config()` / `set_config()`，见 [平台服务管理](services.md)。
:::
