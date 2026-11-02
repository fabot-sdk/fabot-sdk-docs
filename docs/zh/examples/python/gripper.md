---
title: 夹爪
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 夹爪

控制左 / 右夹爪的开合运动、速度与力上限，并订阅开合度流。左右夹爪是同一套 API、各自独立的槽位（`robot.left_gripper` / `robot.right_gripper`）。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [夹爪 Gripper](../../reference/python/gripper.md)。

## 设置上限并执行开合

速度与力上限是持久设置，不随运动调用携带：先 `set_velocity_limit` / `set_force_limit`，再 `move_opening`。开合度取值 [0, 1]，0 全闭、1 全开。

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_gripper"])

    robot.left_gripper.set_velocity_limit(0.5)
    robot.left_gripper.set_force_limit(20.0)

    print("当前开合度:", robot.left_gripper.get_opening())

    op = robot.left_gripper.move_opening(1.0, duration=1.0)   # 全开
    snap = op.get(timeout=5.0)
    print(snap.state is OperationState.Succeeded, robot.left_gripper.get_opening())
```

注意：`opening` 与 `joint[0]` 在当前执行器上恒等映射，反馈都来自同一关节位置；`duration` 是等待预算，不是轨迹时长，运动速度由速度上限控制。

## 开合度伺服

需要连续跟随目标时用 `servo_opening`（短命令），返回实际生效的开合度：

```python
for target in (0.2, 0.5, 0.8):
    print(target, robot.right_gripper.servo_opening(target))
```

## 用物理行程控制

`move_joint` 的目标是 `Doubles`（`values` 长度必须为 1），只有百分比执行器时与开合度等价，同样限制在 [0, 1]：

```python
from fabot.types import Doubles

robot.right_gripper.move_joint(Doubles(values=[0.0])).wait(timeout=5.0)   # 全闭
```

## 订阅开合度流

`opening()` 推送 `Float64`（`value` 为开合度），`joint()` 推送 `JointState`：

```python
ch = robot.left_gripper.opening(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.value)
finally:
    ch.close()
```
