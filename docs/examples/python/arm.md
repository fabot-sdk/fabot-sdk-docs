---
title: 机械臂运动
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 机械臂运动

控制左臂（`robot.left_arm`）或右臂（`robot.right_arm`）做关节运动与末端位姿运动，并订阅实时状态流。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [机械臂 Arm](../../reference/python/arm.md)。

## 使能并执行关节运动

运动前先 `set_enabled` 使能手臂；`move_joints` 返回长时 Operation，用 `events()` 轮询进度，终态后读结果。目标关节角 `positions` 单位弧度，长度与关节数一致；`wait=True` 表示任务等到到位或超时才结束。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_arm"])

    outcome = robot.left_arm.set_enabled(enabled=True)
    print(outcome.success, outcome.statusMessage)

    positions = robot.left_arm.get_joints()
    positions[1] += 0.2   # 第 2 个关节转动 0.2 弧度
    op = robot.left_arm.move_joints(positions=positions, wait=True)
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

- 快照的 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），任务刚启动时可能为 `None`；终态 `result` 为 `OutcomeT`（`success` / `statusMessage`），失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- 同一只手臂的 `move_joints` / `move_pose` 共享同一资源，新任务排队执行；进行中可 `op.cancel()` 取消。

## 按末端位姿运动

`move_pose` 以末端位姿为目标：`pose` 为 `Pose3dT`（`x` / `y` / `z` 米，`qx` / `qy` / `qz` / `qw` 四元数）；`mode` 取 `PoseMoveMode.SMOOTH`（平滑）或 `PoseMoveMode.DIRECT`（直接）；`frame_id` 为参考坐标系，空串等价 `arm_base`。

```python
from fabot.capabilities.arm import PoseMoveMode
from fabot.types.Pose3d import Pose3dT

pose = Pose3dT()
pose.x, pose.y, pose.z = 0.3, 0.0, 0.4
pose.qw = 1.0   # 无旋转的单位四元数

op = robot.right_arm.move_pose(
    pose=pose, mode=PoseMoveMode.SMOOTH, wait=True, frame_id="arm_base",
)
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## 订阅关节位置流

`joints()` 打开关节位置流，用 `frames()` 迭代帧，用完调用 `close()` 释放。帧的 `payload` 为 `JointPositionsT`，`payload.positions` 是各关节角（弧度）；末端位姿流用 `pose()` 订阅，用法相同。

```python
ch = robot.left_arm.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)
finally:
    ch.close()
```

## 相关链接

- [机械臂 Arm](../../reference/python/arm.md)
- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
