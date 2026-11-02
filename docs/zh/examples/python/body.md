---
title: 躯干
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 躯干

控制躯干关节与腰部升降 / 前探 / 俯仰。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [躯干 Body](../../reference/python/body.md)。

## 腰部位姿运动

`move_waist` 用 `WaistPose` 描述腰部：`x` 是水平前探、`z` 是升降、`phi` 是俯仰（弧度），三者都是绝对目标（米 / 米 / 弧度）。增量运动用 `move_waist_relative`。

```python
from fabot import Robot
from fabot.capabilities.body import WaistPose
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    op = robot.body.move_waist(WaistPose(x=0.05, z=0.10, phi=0.0), duration=3.0)
    snap = op.get(timeout=15.0)
    if snap.state is not OperationState.Succeeded:
        print("失败:", snap.error)
    else:
        print("腰部位姿:", robot.body.get_pose().z)
```

躯干的所有运动 Operation 共享资源 `body`，策略 `queue`，默认时限 60 秒。

## 腰部速度伺服

需要连续调速时用 `servo_waist_twist`：`lift` / `turn` / `pitch` 都是归一化速度比例，取值 [-1, 1]，正值分别为向上、左旋、前倾。

```python
robot.body.servo_waist_twist(lift=0.2, turn=0.0, pitch=0.0)
robot.body.servo_waist_twist(lift=0.0, turn=0.0, pitch=0.0)     # 停
```

## 躯干关节运动

`move_joint` 的目标是 4 自由度躯干关节角（`JointPositions`，弧度）；`move_joint_path` 走关节路点序列。

```python
from fabot.types import JointPositions

joints = list(robot.body.get_joint().positions)
joints[1] += 0.05
robot.body.move_joint(JointPositions(positions=joints), duration=2.0).wait(timeout=30.0)
```

## 躯干约束模式

全身控制下躯干可以自由跟随、保持相对姿态、显式跟踪、锁定或与头部耦合：

```python
from fabot.capabilities.body import BodyMode

robot.body.set_mode(BodyMode.TRACKING)    # 显式跟踪 6D 目标
robot.body.set_mode(BodyMode.FREE)        # 回到冗余自由度
print(robot.body.get_mode())
```

## 订阅位姿流

`joint()` 推送 `JointState`，`pose()` 推送 `Pose3d`：

```python
ch = robot.body.pose(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.z)
finally:
    ch.close()
```
