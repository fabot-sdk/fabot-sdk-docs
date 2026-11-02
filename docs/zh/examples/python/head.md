---
title: 头部运动
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 头部运动

控制头部俯仰 / 偏航关节，并跟踪运动进度。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [头部](../../reference/python/head.md)。

## 转动头部到目标关节角

`move_joint` 返回长时 Operation：通过 `events()` 持续取进度快照，终态后读取结果。关节顺序固定为 `[yaw, pitch]`（弧度）。

```python
from fabot import Robot
from fabot.capabilities.head import HeadMode
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    print("当前模式:", robot.head.get_mode())
    print("当前关节:", robot.head.get_joint().positions)

    op = robot.head.move_joint(JointPositions(positions=[0.3, -0.2]), duration=1.5)
    snap = op.get(timeout=10.0)
    if snap.state is not OperationState.Succeeded:
        print("失败:", snap.error)
```

头部运动 Operation 共享资源 `head`，策略 `queue`。

## 头部模式

`HeadMode` 决定全身控制下头部如何工作：`DISABLE` 关闭头部任务，`FORWARD` 锁定正前方，`TRACKING` 跟踪 6D 目标，`GAZE` 时位姿位置即空间注视点。

```python
robot.head.set_mode(HeadMode.TRACKING)
print(robot.head.get_mode())

# 注视一个空间点（GAZE 模式下 Pose3d 的位置就是注视点）
from fabot.types import Pose3d
robot.head.set_mode(HeadMode.GAZE)
robot.head.servo_pose(Pose3d(x=1.0, y=0.2, z=1.2, qw=1.0))
```

## 位姿运动

`move_pose` 让头部按末端位姿运动；`servo_pose` 是短周期伺服，也可只给分量：

```python
robot.head.move_pose(
    Pose3d(x=0.1, y=0.0, z=0.05, qw=1.0, frame_id="base_link"),
    duration=1.0,
).wait(timeout=10.0)

robot.head.servo_pose(y=0.1)
```

## 调整速度与到位阈值

```python
robot.head.set_joint_velocity_limit(1.5)      # 弧度/秒
robot.head.set_joint_acceleration_limit(5.0)  # 弧度/秒²

applied = robot.head.set_arrival_thresholds(joint_tolerance=0.01, max_timeout_s=3.0)
print(applied.outcome.success)
```

## 订阅关节流

```python
ch = robot.head.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)   # [yaw, pitch]
finally:
    ch.close()
```
