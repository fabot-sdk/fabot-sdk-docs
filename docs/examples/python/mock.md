---
title: Mock
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Mock

用 `Robot.mock()` 在没有真实机器人的环境里开发、联调与单元测试。机制与适用边界见 [Mock 测试](../../usage/mock.md)。

## 快速上手

`Robot.mock()` 返回 `MockRobot`（`Robot` 的子类），槽位属性与真实 `Robot` 同名，创建后立即可用，无需 `connect` / `wait_ready`：

```python
from fabot import Robot

robot = Robot.mock()

# 注入 command 行为：on_<command> 钩子
robot.screen.on_show_text = lambda text: print("mock show_text:", text)

robot.screen.show_text(text="hello")   # 命中钩子，打印 mock show_text: hello
robot.close()
```

## Command 钩子

每个 Command / Operation 都有对应的 `on_<方法名>` 钩子。钩子按关键字参数收到请求字段；返回响应对象则作为该次调用的结果，返回 `None`（或不返回值）则用默认响应：

```python
from fabot.types.Outcome import OutcomeT

def blocked(vx, vy, vtheta):
    outcome = OutcomeT()
    outcome.success = False
    outcome.statusMessage = "blocked by obstacle"
    return outcome

robot.chassis.on_set_velocity = blocked
result = robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)
print(result.success, result.statusMessage)   # False blocked by obstacle

robot.chassis.on_set_velocity = None          # 恢复默认行为
```

钩子抛异常时，该次调用抛 `FabotError`（`category` 为 `Internal`，`detail` 为异常信息），可用于测试应用的错误处理路径：

```python
def boom(vx, vy, vtheta):
    raise RuntimeError("boom")

robot.chassis.on_set_velocity = boom
# robot.chassis.set_velocity(...) 将抛 FabotError: Internal, boom
```

错误模型见 [错误处理](../../usage/errors.md)，Command 签名见各能力的 API 参考（如 [底盘](../../reference/python/chassis.md)、[屏幕](../../reference/python/screen.md)）。

## Operation 默认行为

未注入钩子时，Operation 立即以 `Succeeded` 终态完成：

```python
op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
snap = op.get()
print(snap.state, snap.terminal)   # OperationState.Succeeded True
```

注入 `on_move_relative` 等钩子可观察请求参数或自定义返回的 `result`。Operation 模型见 [命令与长时操作](../../usage/commands-operations.md)。

## 急停与整机状态

急停在 Mock 内有真实的内存状态，可用于演练急停流程：

```python
robot.estop.engage(reason="self check")
print(robot.estop.state().asserted)   # True
robot.estop.release()
```

注意 Mock 的行为边界：

- `engage` / `release` 只改 Mock 内部状态，不会自动推送 `estop_changed` 事件，也不会让其他 API 失败。
- `robot.state()` 返回默认快照（`RobotRunState.Unknown`）。
- `power_1` / `power_2` / `screen` / `voice` 的 `status()` 没有默认数据，调用会抛 `RuntimeError("empty status payload")`。
- 数据通道默认不可用：直接打开（如 `robot.left_arm.joints()`）会报 `NotFound`（`not stubbed`）；要喂通道帧需使用下文的 `MockBackend`。

## 底层控制：MockBackend

需要自定义事件推送、通道数据或 handler 时，用 `MockBackend` 配合 `Robot.from_backend()`：

```python
from fabot import Robot
from fabot.core.mock_backend import MockBackend

backend = MockBackend()
robot = Robot.from_backend(backend)
# backend.set_command_handler(...) / set_operation_handler(...)
# backend.set_subscribe_handler(...) + backend.push_frame(...)
# backend.push_event(...)
```

`Robot.mock()` 内部就是这样组装的，只是额外为每个槽位装好了默认 handler 与 `on_*` 钩子。

!!! note
    Mock 只模拟 SDK 侧行为，不验证服务端约束（资源排队、真实错误码、事件时序等）。涉及真实服务端行为的集成测试仍需真实机器人或平台侧测试环境。
