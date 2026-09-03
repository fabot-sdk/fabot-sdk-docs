---
title: 连接与 Robot 入口
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 连接与 Robot 入口

`Robot` 是 SDK 的统一入口：持有连接、按槽位暴露能力 Proxy、聚合整机状态与事件。

## 建立连接

```python
from fabot import Robot

# 按控制面端点连接（zenohd，默认 7557）
robot = Robot.connect("192.168.1.10", 7557)

# 等价写法
robot = Robot.from_endpoint("192.168.1.10", 7557)

# 从配置对象连接
from fabot.core import ClientConfig, ClientOptions
config = ClientConfig(client_id="fabot_sdk")      # zenoh_config_file / auth_token 可选
options = ClientOptions(resolve_timeout_ms=1000, command_timeout_ms=3000)
robot = Robot.from_config(config, options)

# 关闭（也支持 with 上下文管理器）
robot.close()
```

## 等待就绪与连接状态

- `wait_ready(slots=None)`：阻塞等待指定槽位（默认全部）可用。
- `connection` 属性：`is_connected()` 查询、`subscribe(cb)` 订阅 Manager 连接变化（`ManagerConnectionChangedEvent`）。

## 能力槽位

能力以**只读属性**按槽位暴露，共 22 个槽位：

| 槽位属性 | 能力模块 | 槽位属性 | 能力模块 |
|----------|----------|----------|----------|
| `io` | io | `motion` | motion |
| `screen` | screen | `teleop` | teleop |
| `chassis` | chassis | `arms` | arms |
| `left_arm` / `right_arm` | arm | `left_hand` / `right_hand` | hand |
| `left_gripper` / `right_gripper` | gripper | `head` | head |
| `body` | body | `light` | light |
| `power_1` / `power_2` | power | `voice` | voice |
| `head_camera` / `chest_camera` | camera | `left_wrist_camera` / `right_wrist_camera` | camera |

- 槽位未绑定 adapter 时访问会抛 `AdapterUnbound`（`NotFound`，code 6002）；先用 `has_adapter` 判断。
- 需要访问具体 adapter 实现的强类型配置/扩展时，用 `proxy.as_adapter(FabotIo)`（`fabot.adapters` 下的 Typed Proxy），类型不符抛 `AdapterMismatch`。

## 整机级方法

`state()` / `status()` / `faults()` / `version()` / `sdk_version`，详见 [状态、故障与生命周期](status-faults.md)。

## 离线开发与测试

`Robot.mock()` 返回 `MockRobot`，无需真实机器人即可开发联调，见 [Mock 测试](mock.md)。
