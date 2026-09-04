---
title: 连接与 Robot 入口
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 连接与 Robot 入口

`Robot` 是 SDK 的统一入口：持有与机器人控制面的连接、按槽位暴露能力 Proxy、聚合整机急停、事件、状态与配置。本文说明如何建立与关闭连接、配置客户端选项、等待槽位就绪与订阅连接状态；`Robot` 全部成员的签名细节见 [Robot 入口](../reference/python/robot.md)。

## 建立连接

```python
from fabot import Robot

# 按控制面端点连接（默认端口 7557）
robot = Robot.connect("192.168.1.10", 7557)

# 等价写法：connect 是 from_endpoint 的别名
robot = Robot.from_endpoint("192.168.1.10", 7557)

# 从配置对象连接
from fabot.core import ClientConfig, ClientOptions
config = ClientConfig(client_id="fabot_sdk")
options = ClientOptions(resolve_timeout_ms=1000, command_timeout_ms=3000)
robot = Robot.from_config(config, options)

# 推荐用 with 管理生命周期，退出时自动 close()
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
```

- 工厂方法阻塞至连接建立，失败抛 `FabotError`（连接类问题的排查见 [故障排除](../troubleshooting.md)）。
- 工厂方法与 `close()` 不得在事件回调（SDK I/O 线程）中调用，否则抛 `ClientThreadError`。
- `from_backend(backend, options)` 接入自定义传输后端，属高级用法；`Robot.mock()` 返回无需真实机器人的 `MockRobot`，见 [Mock 测试](mock.md)。
- `close()` 关闭全部订阅与连接；已关闭的 `Robot` 不可继续使用。前置环境要求见 [环境要求](../install/requirements.md)。

`ClientConfig`（客户端标识与传输选项，全部字段可省略）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `client_id` | `str` | `"fabot_sdk"` | 客户端标识 |
| `zenoh_config_file` | `str` | `""` | 自定义传输配置文件路径 |
| `auth_token` | `bytes` | `b""` | 认证令牌 |
| `max_control_message_bytes` | `int` | `1048576` | 控制消息上限（字节） |

`ClientOptions`（超时与缓存选项，全部字段可省略）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `resolve_timeout_ms` | `int` | `1000` | 槽位解析超时（毫秒），也是 `wait_ready` 单槽位等待上限 |
| `command_timeout_ms` | `int` | `3000` | Command 默认超时（毫秒），可在每次调用时覆盖 |
| `resolve_cache_ttl_ms` | `int` | `30000` | 解析缓存有效期（毫秒） |
| `resolve_cache_capacity` | `int` | `256` | 解析缓存容量 |
| `completion_executor` | — | `None` | 异步回调的完成执行器 |
| `channel_renew_threads` | `int` | `2` | 通道续租工作线程数（全客户端共享，与通道数量无关） |

## 等待就绪

`wait_ready(slots=None)` 阻塞等待指定槽位（默认全部）解析完成：

```python
robot.wait_ready()                       # 全部已绑定槽位
robot.wait_ready(["left_arm", "io"])     # 只等指定槽位
```

语义：读取当前槽位配置，只对**已启用（enabled）、必需（required）且已绑定 adapter** 的目标槽位阻塞解析；未绑定、被禁用或 `required=False` 的槽位直接跳过，不予等待。单个槽位的解析超时由 `ClientOptions.resolve_timeout_ms` 控制，解析失败抛异常。

## 连接状态

`robot.connection` 提供连接状态查询与订阅：

```python
if robot.connection.is_connected():
    print("connected")

def on_connection(state):
    print("connected:", state.connected)

token = robot.connection.subscribe(on_connection)
# ...
token.close()    # 退订；robot.close() 会统一关闭全部订阅
```

- `is_connected()`：当前是否已连上控制面。
- `subscribe(callback)`：回调接收 `ConnectionState`（仅一个字段 `connected: bool`）；订阅时立即以当前状态回调一次，之后每次连接状态变化再回调。返回 `SubscriptionToken`，用 `token.close()` 退订。
- 回调在 SDK I/O 线程执行，须保持轻量，禁止在回调内调用阻塞 API。订阅本身也不得在回调线程中发起。

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

- 槽位未绑定 adapter 时，访问其能力方法会抛 `AdapterUnbound`（属 `NotFound` 类别）；先用 `has_adapter`（只读属性）判断：

  ```python
  if robot.io.has_adapter:
      robot.io.set_digital_output(channel="do0", value=True)
  ```

- 需要访问具体 adapter 实现的强类型配置/扩展时，用 `proxy.as_adapter(FabotIo)`（`fabot.adapters` 下的强类型视图）；槽位未绑定抛 `AdapterUnbound`，绑定的 adapter 类型不符抛 `AdapterMismatch`。两类错误的处理见 [错误处理](errors.md)。

各槽位 Proxy 的能力 API 见 [Python API 参考](../reference/python/index.md)。

## 整机级入口

- `state()` / `status()` / `faults()` / `version()` / `sdk_version`：整机状态聚合，详见 [状态、故障与生命周期](status-faults.md)。
- `estop`：急停触发与解除（`engage` / `release` / `state`）。
- `events`：整机事件订阅（急停、运行状态、配置、故障等变化），见 [事件与数据通道](events-channels.md)。
- `configuration`：槽位绑定与配置读写，见 [配置管理](configuration.md)。
- `services`：平台服务管理，见 [平台服务管理](services.md)。
- `logs`：日志流订阅。

## 离线开发与测试

`Robot.mock()` 返回 `MockRobot`，接口与 `Robot` 一致，无需真实机器人即可开发联调，能力边界与限制见 [Mock 测试](mock.md)。
