---
title: Mock 测试
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Mock 测试

SDK 内置 Mock 后端，无需真实机器人即可开发、联调与单元测试。两种用法：

- `Robot.mock()`：一行创建全槽位可用的 `MockRobot`，按需注入行为钩子（推荐，覆盖绝大多数场景）。
- `MockBackend` + `Robot.from_backend()`：完全手工控制底层行为，可注入事件、通道帧与连接变化（高级用法）。

## 快速开始：`Robot.mock()`

```python
from fabot import Robot

robot = Robot.mock()                     # MockRobot：Robot 的子类
robot.connection.is_connected()          # True：创建即"已连接"，无需 connect()/wait_ready()
```

- `MockRobot` 与 `Robot` 的 23 个槽位属性同名，应用代码无需区分；只是每个 proxy 是对应的 Mock proxy（如 `ChassisMockProxy`，继承 `ChassisProxy`），额外暴露一组 `on_<command>` 钩子。
- 技能也有 Mock proxy：`robot.skills.camera_sync` / `robot.skills.voice_aiui` 的 `is_available` 为 `True`。
- `robot.services`、`robot.metrics`、`robot.logs`、`robot.frames` 与真实连接同样可用（服务控制只返回成功、状态保持原值）。

## 注入 Command 行为

钩子名是 `on_` 加方法名（`on_get_pose`、`on_show_text`、`on_move_joint` 等），签名与对应调用一致，返回值决定行为：

- 返回 `None`（或不返回）：使用默认成功响应（空壳对象，字段均为默认值）；
- 返回响应对象：替换默认响应；
- 抛出异常：本次调用以 `FabotError`（`Internal`）失败——可用来测试错误处理路径。

```python
from fabot import Robot
from fabot.types import Pose2d

robot = Robot.mock()

# 返回自定义响应
robot.chassis.on_get_pose = lambda: Pose2d(x=1.5, y=2.0)

# 记录参数；返回 None -> 默认成功响应
calls = []
robot.chassis.on_servo_twist = lambda **kwargs: calls.append(kwargs)

robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.0)
print(robot.chassis.get_pose(), calls)

# 注入失败：钩子抛异常 -> 调用方收到 FabotError
def broken_show_text(text):
    raise RuntimeError("screen offline")

robot.screen.on_show_text = broken_show_text
```

## 注入 Operation 行为

Operation 钩子（如 `on_move_station` / `on_move_joint` / `on_listen`）用法相同：钩子的返回值作为终态 `result`。默认情况下 Operation 启动后立即到达 `Succeeded` 终态（无 `Running` 中间过程与进度反馈），`operation_id` 自动生成：

```python
from fabot import Robot
from fabot.core import OperationState

robot = Robot.mock()

op = robot.chassis.move_station(3)
snap = op.get()
assert snap.state == OperationState.Succeeded and snap.terminal
```

需要失败、中间态等完整快照控制时，用 `MockBackend.set_operation_handler`（见下）。

## 默认行为一览

| 面 | 默认行为 |
|----|----------|
| Command | 成功空壳响应（字段为默认值） |
| Operation | 立即 `Succeeded`，空壳 `result` |
| Channel | 打开通道会以 `NotFound`（"not stubbed"）失败：Mock 没有为任何通道注册默认处理器 |
| 事件 | 不自发产生 |
| 整机状态 | `state()` / `status()` / `faults()` 返回空快照 |
| 急停 / 配置 / 服务 | 急停 `engage` / `release` 更新内存中的 `EstopState`；`configuration` 的 `get` / `apply` 维护内存配置与 revision；`services` 控制操作返回成功、运行状态保持 `Unknown` |
| 技能 | `skills.camera_sync` 等 Proxy 可用，`is_available` 为 `True` |

:::note 未绑定 adapter 的槽位
Mock 里槽位是否「已绑定 adapter」取决于内存配置，默认全部未绑定。因此 `robot.<slot>.get_config()` 会抛 `AdapterUnbound`，与真机上配置未就绪时的行为一致——这正是需要覆盖的路径之一。
:::

## 高级用法：`MockBackend`

需要注入事件、通道帧，或模拟连接断开时，直接使用 `fabot.core.MockBackend`：

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

# 模拟 Manager 连接断开 / 恢复：触发 connection.subscribe 回调
backend.set_manager_connected(False)
```

主要注入点：

- `set_command_handler(slot_or_cap, method, handler)` / `set_operation_handler(...)` / `set_subscribe_handler(...)`：按（槽位或能力，方法名）注册底层处理器；payload 为 `BytesPayload`，配合 `encode_flatbuffer` / `decode_flatbuffer` 编解码；
- `push_event(event)`：向 selector 匹配的事件订阅投递一个 `Event`（订阅模型见 [事件与数据通道](events-channels.md)）；
- `push_frame(channel_id, frame)`：向通道观察者投递一帧 `ChannelFrame`；
- `set_manager_connected(bool)`：模拟连接状态变化。

:::warning
`Robot.from_backend(MockBackend())` 不注册任何默认处理器：未注册的 Command / Operation / Channel 调用都会以 `NotFound`（"not stubbed"）失败。想要「默认成功 + 手工注入」的组合，请用 `Robot.mock()` 并替换个别钩子。
:::

## 限制

- Mock 只模拟 SDK 侧行为，不验证服务端约束（参数合法性、资源冲突、真实诊断码等）。
- 事件与通道不会自发产生数据；Operation 没有真实的异步推进过程（无进度反馈，立即终态）。
- 涉及真实服务端行为的集成测试仍需真实机器人或平台侧测试环境。

## 相关页面

- [连接与 Robot 入口](connection.md) — 槽位清单、`Robot.from_backend`
- [命令与长时操作](commands-operations.md) — Command / Operation 模型
- [事件与数据通道](events-channels.md) — 事件订阅与数据通道
- [错误处理](errors.md) — `FabotError` 层次
- [示例：Mock](../examples/python/mock.md)
- [Robot 参考](../reference/python/robot.md)
