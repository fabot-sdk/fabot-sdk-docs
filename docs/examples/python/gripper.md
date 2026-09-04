---
title: 夹爪
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 夹爪

控制左 / 右夹爪的开合运动、速度与力矩，并订阅开合度流。左右夹爪是同一套 API、各自独立的槽位（`robot.left_gripper` / `robot.right_gripper`）。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [夹爪 Gripper](../../reference/python/gripper.md)。

## 设置速度 / 力矩并执行开合

`move_joints` 的速度与力矩不随调用携带，先经 `set_velocity` / `set_torque` 设置持久值；`move_joints` 返回长时 Operation，用 `events()` 轮询进度快照直至终态。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_gripper"])

    gripper = robot.left_gripper
    print("当前开合度:", gripper.get_joints())

    applied_v = gripper.set_velocity(velocity=0.5)
    applied_t = gripper.set_torque(torque=0.3)
    print("速度:", applied_v.appliedVelocity, "力矩:", applied_t.appliedTorque)

    op = gripper.move_joints(positions=[0.8], duration_s=0.0, position_threshold=0.0)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=10000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("到位:", snap.result.success)
    else:
        print("失败:", snap.error)
```

注意：

- `positions` 长度依末端载具定义，常见单自由度夹爪长度为 1；`duration_s` / `position_threshold` 传 `0.0` 使用默认值（5 秒 / 0.01）。
- `set_velocity` / `set_torque` 返回 `ToolSpeedAppliedT` / `TorqueAppliedT`：`outcome.success` 指示是否被接受，`appliedVelocity` / `appliedTorque` 为实际生效值。
- 同一只夹爪的 `move_joints` 任务共享同一运动资源，新任务排队执行，见 [夹爪 Gripper](../../reference/python/gripper.md)。

## 订阅开合度流

`joints()` 打开开合度通道，用 `frames()` 迭代帧，用完务必 `close()`：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_gripper"])

    ch = robot.right_gripper.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

帧 `payload` 为 `JointPositionsT`，`payload.positions` 即各关节开合度；`qos_profile` 是字符串（`"latest"` / `"realtime"` / `"reliable"`），不是枚举，约定见 [事件与数据通道](../../usage/events-channels.md)。
