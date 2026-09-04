---
title: Mock 测试
status: draft
owner: fabot-core
updated: 2026-09-04
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

- `MockRobot` 与 `Robot` 的 22 个槽位属性同名，应用代码无需区分；只是每个 proxy 是对应的 Mock proxy（如 `ChassisMockProxy`，继承 `ChassisProxy`），额外暴露一组 `on_<command>` 钩子。槽位清单见 [连接与 Robot 入口](connection.md)。
- 每个 Command / Operation 都有对应的钩子属性，覆盖该能力的全部调用。

## 注入 Command 行为

钩子签名与对应调用的参数一致（关键字传参），返回值决定行为：

- 返回 `None`（或不返回）：使用默认成功响应（空壳对象，字段均为默认值）；
- 返回响应对象：替换默认响应；
- 抛出异常：本次调用以 `FabotError`（`Internal`）失败——可用来测试错误处理路径。

```python
from fabot import Robot
from fabot.capabilities.chassis import StationInfoT, StationListT

robot = Robot.mock()

# 记录参数；返回 None -> 默认成功响应
calls = []
robot.chassis.on_set_velocity = lambda vx, vy, vtheta: calls.append((vx, vy, vtheta))
robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)

# 自定义响应
def fake_stations():
    station = StationInfoT()
    station.stationId = 7
    station.name = "charging"
    resp = StationListT()
    resp.stations = [station]
    return resp

robot.chassis.on_list_stations = fake_stations
print(robot.chassis.list_stations().stations[0].stationId)   # 7

# 注入失败：钩子抛异常 -> 调用方收到 FabotError
def broken_show_text(text):
    raise RuntimeError("screen offline")

robot.screen.on_show_text = broken_show_text
```

## 注入 Operation 行为

Operation 钩子（如 `on_move_relative` / `on_navigate_to_station`）用法相同：钩子的返回值作为终态 `result`。默认情况下 Operation 启动后立即到达 `Succeeded` 终态（无 `Running` 中间过程与进度反馈），`operation_id` 自动生成：

```python
from fabot import Robot
from fabot.core import OperationState

robot = Robot.mock()

op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
snap = op.get()
assert snap.state == OperationState.Succeeded and snap.terminal
```

需要失败、中间态等完整快照控制时，用 `MockBackend.set_operation_handler`（见下）。

## 默认行为一览

| 面 | 默认行为 |
|----|----------|
| Command | 成功空壳响应（字段为默认值） |
| Operation | 立即 `Succeeded`，空壳 `result` |
| Channel | 不推送任何帧 |
| 事件 | 不自发产生 |
| 整机状态 | `state()` / `status()` / `faults()` 返回空快照 |
| 急停 / 配置 / 服务 | 在内存中生效：`estop` 的 engage/release 更新 `EstopState`；`configuration` 的 get/apply 维护内存中的配置与 revision；`services` 控制操作返回成功、运行状态保持 `Unknown` |

## 高级用法：`MockBackend`

需要注入事件、通道帧，或模拟连接断开时，直接使用 `fabot.core.MockBackend`：

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

# 模拟 Manager 连接断开/恢复：触发 connection.subscribe 回调
backend.set_manager_connected(False)
```

主要注入点：

- `set_command_handler` / `set_operation_handler` / `set_subscribe_handler`：按（槽位或能力，方法名）注册底层处理器；payload 为 `BytesPayload`，配合 `encode_flatbuffer` / `decode_flatbuffer` 编解码；
- `push_event(event)`：向 selector 匹配的事件订阅投递一个 `Event`（订阅模型见 [事件与数据通道](events-channels.md)）；
- `push_frame(channel_id, frame)`：向通道观察者投递一帧 `ChannelFrame`；
- `set_manager_connected(bool)`：模拟连接状态变化。

:::warning
`Robot.from_backend(MockBackend())` 不注册任何默认处理器：未注册的 Command / Operation / Channel 调用都会以 `NotFound`（"not stubbed"）失败。想要「默认成功 + 手工注入」的组合时，需自行在 backend 上注册处理器。
:::

## 限制

- Mock 只模拟 SDK 侧行为，不验证服务端约束（参数合法性、资源冲突、真实错误码等）。
- 事件与通道不会自发产生数据；Operation 没有真实的异步推进过程（无进度反馈，立即终态）。
- 涉及真实服务端行为的集成测试仍需真实机器人或平台侧测试环境。

## 相关页面

- [连接与 Robot 入口](connection.md) — 槽位清单、`Robot.from_backend`
- [命令与长时操作](commands-operations.md) — Command / Operation 模型
- [事件与数据通道](events-channels.md) — 事件订阅与数据通道
- [错误处理](errors.md) — `FabotError` 层次
- [示例：Mock](../examples/python/mock.md)
- [Robot 参考](../reference/python/robot.md)
