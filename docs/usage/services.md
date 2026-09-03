---
title: 平台服务管理
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 平台服务管理

机器人上的平台服务（service，如 `fabot_ocs2`）对 SDK 只暴露 **7 个平台操作**，业务接口不对客户端开放。`client_control: none` 的服务不会出现在列表中。

## 7 个平台操作

| 操作 | 说明 |
|------|------|
| `start()` / `stop()` / `restart()` | 生命周期控制 |
| `state()` | `ServiceState`（含 `is_running()`） |
| `is_running()` | 运行中判断 |
| `get_config()` / `set_config(cfg)` | 读取 / CAS 修改服务配置（冲突抛 `ConfigurationConflict`） |

```python
svc = robot.services.fabot_ocs2        # FabotOcs2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # 强类型配置 dataclass
svc.set_config(cfg)                     # CAS，冲突抛 ConfigurationConflict
```

## 观察服务状态变化

订阅 `robot.events.service_state_changed`，见 [事件与数据通道](events-channels.md)。
