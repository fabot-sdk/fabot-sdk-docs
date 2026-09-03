---
title: Mock 测试
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Mock 测试

SDK 内置 Mock 后端，无需真实机器人即可开发、联调与单元测试。

## 快速使用

```python
from fabot import Robot

robot = Robot.mock()          # MockRobot，属性与 Robot 同名

# 注入 command 行为：on_<command> 钩子
robot.chassis.on_set_velocity = lambda vx, vy, vtheta: ...
robot.chassis.on_move_relative = lambda dx, dy, dtheta: ...

# 应用代码照常调用
robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)
```

## 行为约定

- 未注入钩子时，Mock 有无害默认：command 返回成功空壳，Operation 立即 `Succeeded`，Channel 无默认数据。
- Mock proxy（如 `ChassisMockProxy`）继承对应产品 proxy，应用代码无需区分。
- 更低层的控制可用 `MockBackend`（`set_command_handler` / `set_operation_handler` / `push_event` / `push_frame` 等）配合 `Robot.from_backend()`。

!!! note
    Mock 只模拟 SDK 侧行为，不验证服务端约束（如资源冲突、真实错误码）。涉及服务端真实约束的集成测试仍需真实系统或平台侧测试环境。
