---
title: 配置管理
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 配置管理

配置分两级：**整机配置**（槽位绑定，`robot.configuration`）与**能力 / 技能配置域**（各实体自己的参数，`proxy.get_config()` 等）。两者都采用 **CAS（Compare-And-Swap）**：提交时携带期望版本，与机器人当前状态冲突时抛 `ConfigurationConflict`（错误层次见 [错误处理](errors.md)）。

## 两层配置的分工

| 层级 | 入口 | 管什么 |
|------|------|--------|
| 整机 | `robot.configuration.get()` / `apply()` | 哪个槽位绑定哪个 adapter、是否启用、是否必需、部署节点 |
| 能力 / 技能 | `robot.<slot>.get_config()` / `set_config()` / `edit_config()` | 该实体自己的参数域（到位阈值、相机流配置、同步组等） |

改能力参数不需要构造整机补丁；改「某槽位装什么 adapter」才用整机配置。

## 整机配置

```python
cfg = robot.configuration.get()     # RobotConfig 快照
print(cfg.revision)
print(cfg.io.adapter_id)            # "fabot_io"
print(cfg.to_yaml())
```

`RobotConfig` 上每个槽位是一个 `SlotBinding` 属性（如 `cfg.io`、`cfg.left_arm`、`cfg.chassis`；全部 23 个槽位见 [Robot 入口](../reference/python/robot.md)）。

### 修改绑定

构造一个只描述改动的补丁，再 `apply()` 提交：

```python
from fabot.robot import RobotConfig
from fabot.adapters import IoConfig

patch = RobotConfig()                       # 空补丁：未触碰的槽位保持现状
patch.io.bind(IoConfig())                   # 绑定 fabot_io 并写入其配置域
patch.chassis.unbind()                      # 解绑底盘

new_cfg = robot.configuration.apply(patch)  # CAS 提交，返回应用后的新快照
```

`apply()` 内部会先读取最新配置、把补丁中**触碰过的槽位**合并进去（`merge_touched`），再带着最新 `revision` 提交，因此补丁只需包含要改的部分。

`to_yaml()` 只重写 `adapters` 段，其余顶层键（服务、坐标系等）原样保留——整份替换会让平台停掉被漏掉的服务。

:::note
`from_yaml()` / `get()` 得到的配置用于查看与备份；其中槽位不算「触碰」，直接当补丁提交不会产生任何改动。要修改请用 `bind()` / `unbind()`。
:::

### 冲突重试

多个客户端同时改配置时，冲突方会收到 `ConfigurationConflict`。`apply()` 每次都基于最新配置合并，直接重试即可：

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

| 方法 | 说明 |
|------|------|
| `bind(config, *, required=None, node_id=None, enabled=None)` | 绑定 adapter，`config` 为其配置类或实例；可选设置 `required` / `node_id` / `enabled` |
| `unbind()` | 解绑槽位 |
| `to_mapping()` | 导出为字典；未绑定时返回 `None` |
| `domain_updates()` | 取出该槽位被触碰的配置域文档 |

改动绑定会触发对应能力的生命周期迁移（见 [状态、故障与生命周期](status-faults.md)），可通过 `robot.events.registry_changed` 与 `robot.events.config_changed` 观察（见 [事件与数据通道](events-channels.md)）。

### RobotConfig 工具方法

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

## 能力配置域

每个 adapter 的配置域对应一个强类型 dataclass（`fabot.adapters` 下，支持 `to_yaml()` / `from_yaml()` / `field_options()`）。槽位 Proxy 上有三个方法：

| 方法 | 说明 |
|------|------|
| `get_config()` | 读取该槽位当前绑定的配置域，返回强类型 dataclass |
| `set_config(config)` | 只提交该槽位的配置域，其他槽位与顶层键不动；返回最新配置 |
| `edit_config()` | 上下文管理器：进入时读取，退出时把**改动的域**提交回去 |

`edit_config()` 是最省事的读写方式，只提交真正变了的部分：

```python
with robot.left_arm.edit_config() as conf:
    conf.arrival.joint_tolerance = 0.01
# 退出时自动提交 arrival 域
```

等价的显式写法：

```python
conf = robot.left_arm.get_config()
conf.arrival.max_timeout_s = 8.0
robot.left_arm.set_config(conf)
```

`get_config()` 在槽位未绑定 adapter 时抛 `AdapterUnbound`，配置类型未注册时抛 `RuntimeError`。

技能（`robot.skills.*`）用同一组方法读写自己的配置域，见 [技能与扩展](skills.md)。

## 平台服务配置

服务（service）的配置走 `robot.services` 的 `get_config()` / `set_config()`，见 [平台服务管理](services.md)。
