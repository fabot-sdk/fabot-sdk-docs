---
title: Mock
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Mock

用 `Robot.mock()` 在没有真实机器人的环境里开发、联调与单元测试。机制与适用边界见 [Mock 测试](../../usage/mock.md)。

## 快速上手

`Robot.mock()` 返回 `MockRobot`（`Robot` 的子类），槽位属性与真实 `Robot` 同名，创建后立即可用，无需 `connect` / `wait_ready`：

```python
from fabot import Robot

robot = Robot.mock()

print(robot.connection.is_connected())      # True
print(robot.state())                        # 空快照
print(robot.chassis.get_pose())             # 默认 Pose2d(0, 0, 0)
```

## 注入命令响应

钩子名是 `on_` 加方法名，返回值即响应；返回 `None` 表示用默认空壳响应，抛异常则调用方收到 `FabotError`。

```python
from fabot import Robot
from fabot.types import Pose2d

robot = Robot.mock()

# 固定响应
robot.chassis.on_get_pose = lambda: Pose2d(x=1.5, y=2.0, theta=0.3)

# 记录参数
sent = []
robot.chassis.on_servo_twist = lambda **kwargs: sent.append(kwargs)

robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
print(robot.chassis.get_pose(), sent)
```

## 注入失败路径

用钩子抛异常覆盖错误分支：

```python
robot.screen.on_show_text = lambda text: (_ for _ in ()).throw(RuntimeError("screen offline"))

from fabot import FabotError
try:
    robot.screen.show_text("hi")
except FabotError as err:
    print("捕获:", type(err).__name__, err)
```

## 注入 Operation 结果

Operation 钩子的返回值作为终态 `result`；默认立即 `Succeeded`：

```python
from fabot.core import OperationState
from fabot.types import Outcome

robot.chassis.on_move_station = lambda station_id, **kwargs: Outcome(success=True, status_message="arrived")

snap = robot.chassis.move_station(3).get()
print(snap.state is OperationState.Succeeded, snap.result.status_message)
```

## 验证配置与服务调用

Mock 的 `services` 控制操作返回成功，`configuration` 维护内存中的配置与 revision：

```python
robot.services.ocs2.start()
print(robot.services.ocs2.is_running())

cfg = robot.configuration.get()
print(cfg.revision)
```

注意：Mock 里槽位默认**未绑定 adapter**，所以 `robot.left_arm.get_config()` 会抛 `AdapterUnbound`——这与真机上配置未就绪时的行为一致，可直接用来测这条分支。

## 用 MockBackend 控制底层

需要注入事件、通道帧或模拟断线时用 `MockBackend`：

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

seen = []
robot.connection.subscribe(lambda st: seen.append(st.connected))
backend.set_manager_connected(False)
print(seen)          # [True, False]
```

:::warning
`Robot.from_backend(MockBackend())` 不注册任何默认处理器，未注册的调用会以 `NotFound`（"not stubbed"）失败。需要「默认成功 + 个别替换」时用 `Robot.mock()`。
:::
