---
title: 双臂运动
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 双臂运动

控制双臂按关节角或末端位姿协同运动，切换耦合与导纳模式，并订阅关节流。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [双臂](../../reference/python/arms.md)。

## 关节运动到目标角度

先读取当前双臂关节角，微调后下发 `move_joint`，通过 `events()` 轮询进度直至终态。`DualJoints` 的 `left` / `right` 各是一个 `JointPositions`（弧度）。

```python
from fabot import Robot
from fabot.capabilities.arms import DualJoints
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["arms"])

    state = robot.arms.get_joint()
    left = list(state.left.positions)
    right = list(state.right.positions)
    left[1] += 0.1

    op = robot.arms.move_joint(
        DualJoints(left=JointPositions(positions=left), right=JointPositions(positions=right)),
        duration=3.0,
    )
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.terminal:
            break

    if snap.state is OperationState.Succeeded:
        print("到位")
    else:
        print("失败:", snap.error)
```

注意：双臂所有运动 Operation 共享资源 `arms`，策略 `queue`。

## 关节与末端位姿伺服

需要高频外环时用 `servo_pose`（短命令），一次一个目标，返回实际生效位姿：

```python
from fabot.types import Pose3d

left_goal = Pose3d(x=0.35, y=0.15, z=0.30, qw=1.0, frame_id="torso_link")
right_goal = Pose3d(x=0.35, y=-0.15, z=0.30, qw=1.0, frame_id="torso_link")
applied = robot.arms.servo_pose(left=left_goal, right=right_goal)
print(applied.left, applied.right)
```

## 耦合模式与导纳拖拽

`ArmsMode.COUPLED` 保持开启耦合那一刻的相对末端位姿；`ImpedanceMode` 用于导纳拖拽示教，`DISABLED` 回到刚性位置控制。

```python
from fabot.capabilities.arms import ArmsMode, ImpedanceMode

robot.arms.set_mode(ArmsMode.COUPLED)        # 锁定相对位姿
# ... 双臂一起运动 ...

robot.arms.set_impedance(ImpedanceMode.LOW)  # 轻导纳，可手动拖动示教
# ... 手动拖拽 ...
robot.arms.set_impedance(ImpedanceMode.DISABLED)

robot.arms.set_mode(ArmsMode.INDEPENDENT)    # 回到各自独立
```

## 抱闸与限速

`set_brake(open=True)` 同时松开两侧抱闸，返回 `DualBrakeState`（`left_open` / `right_open`）。速度与加速度上限按整套双臂生效：

```python
brakes = robot.arms.set_brake(open=True)
print(brakes.left_open, brakes.right_open)

robot.arms.set_joint_velocity_limit(1.0)     # 弧度/秒
robot.arms.set_linear_velocity_limit(0.2)    # 米/秒
print(robot.arms.get_joint_velocity_limit(), robot.arms.get_linear_velocity_limit())
```

## 订阅关节流

`joint()` 通道推送 `DualJointState`（`left` / `right` 共用同一时间戳）；`pose()` 推送 `DualPose`：

```python
ch = robot.arms.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.left.positions, frame.payload.right.positions)
finally:
    ch.close()
```
