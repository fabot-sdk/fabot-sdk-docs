---
title: 灵巧手
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 灵巧手

控制灵巧手关节开合，并订阅关节开合度流。左右手是同一套 API、各自独立的槽位（`robot.left_hand` / `robot.right_hand`）。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [灵巧手](../../reference/python/hand.md)。

## 控制手指开合

先经 `set_velocity` / `set_torque` 设置持久速度与力矩，再用 `move_joints` 执行长时运动：通过 `events()` 持续取进度快照，终态后读取结果。开合度建议归一化 0~1（0 弯曲收拢、1 伸直张开），列表长度依手部构型而定。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_hand"])

    current = robot.left_hand.get_joints()
    print("当前开合度:", current)

    applied = robot.left_hand.set_velocity(velocity=0.5)
    print("速度生效:", applied.outcome.success, applied.appliedVelocity)
    applied = robot.left_hand.set_torque(torque=0.3)
    print("力矩生效:", applied.outcome.success, applied.appliedTorque)

    op = robot.left_hand.move_joints(
        positions=[0.0, 0.0, 0.0, 0.0, 0.0],  # 五指收拢
        duration_s=5.0,
        position_threshold=0.02,
    )
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("到位:", snap.result.statusMessage)
    else:
        print("失败:", snap.error)
```

注意：

- `set_velocity` / `set_torque` 返回的 `appliedVelocity` / `appliedTorque` 是实际生效值，可能与请求值不同。
- 进度快照的 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），任务刚启动时可能为 `None`。
- 同一只手上的 `move_joints` 独占该手资源，新任务排队执行；失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。

## 订阅关节开合度流

`joints()` 打开关节开合度通道，用 `frames()` 迭代帧；用完调用 `close()` 释放通道。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_hand"])

    ch = robot.right_hand.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

注意：

- 帧的 `payload` 为 `JointPositionsT`，各关节开合度在 `payload.positions`。
- `qos_profile` 取值 `"latest"` / `"realtime"` / `"reliable"`，通道通用用法见 [事件与数据通道](../../usage/events-channels.md)。

## 相关链接

- [灵巧手 API 参考](../../reference/python/hand.md)
- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
