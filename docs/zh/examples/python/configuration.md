---
title: 配置重试
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 配置重试

读取并修改机器人配置，遇到并发冲突时重试。CAS 机制与 `RobotConfig` / `SlotBinding` 结构见 [配置管理](../../usage/configuration.md)，错误类型见 [错误处理](../../usage/errors.md)。

## 整机绑定：补丁 + 重试

修改流程：构造只含改动的 `RobotConfig` 补丁 → 用 `bind()` / `unbind()` 标记改动 → `apply()` 提交。`apply()` 内部会重新读取当前 `revision`、只合并触碰过的槽位；提交期间 `revision` 被其他客户端改动时抛 `ConfigurationConflict`，重新提交即可。

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
            print("已应用，revision =", cfg.revision)
            break
        except ConfigurationConflict as err:
            print("冲突，重试", attempt, err)
    else:
        raise RuntimeError("配置三次提交均冲突")
```

## 能力配置域：只改一个域

能力参数不需要整机补丁，直接读写该槽位的配置域。`edit_config()` 是上下文管理器：进入时读取，退出时只提交**变化过的域**。

```python
with robot.left_arm.edit_config() as conf:
    conf.arrival.joint_tolerance = 0.01
    conf.arrival.max_timeout_s = 8.0
# 退出时自动提交 arrival 域
```

等价的显式写法，便于显式控制重试：

```python
from fabot.errors import ConfigurationConflict

for attempt in range(3):
    conf = robot.left_arm.get_config()
    conf.arrival.joint_tolerance = 0.01
    try:
        robot.left_arm.set_config(conf)
        break
    except ConfigurationConflict:
        print("冲突，重试", attempt)
```

## 服务配置

平台服务的配置用同样的 CAS 模式：

```python
from fabot.services import Ocs2Config

svc = robot.services.ocs2
for attempt in range(3):
    cfg = svc.get_config()
    cfg.launch.hardware = "real"
    try:
        cfg = svc.set_config(cfg)
        break
    except ConfigurationConflict:
        print("冲突，重试", attempt)
```

注意枚举字段可以传字符串（`"real"`），也可以用 `Ocs2Config.field_options()` 拿到合法取值建下拉框。

## 备份与迁移

`to_yaml()` / `from_yaml()` 用于导出与导入整机配置；导出的 YAML 可直接用编辑器比对或存档：

```python
yaml_text = robot.configuration.get().to_yaml()
open("robot_config.backup.yaml", "w").write(yaml_text)

# 从备份恢复（注意：from_yaml 的槽位不算「触碰」，需要显式 bind 才生效）
# from fabot.robot import RobotConfig
# restored = RobotConfig.from_yaml(open("robot_config.backup.yaml").read())
```
