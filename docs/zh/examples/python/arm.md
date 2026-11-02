---
title: 机械臂运动
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 机械臂运动

控制左臂（`robot.left_arm`）或右臂（`robot.right_arm`）做关节运动与末端位姿运动，并订阅实时状态流。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [机械臂 Arm](../../reference/python/arm.md)。

## 使能并执行关节运动

运动前先 `set_enable` 使能手臂；`move_joint` 返回长时 Operation，用 `events()` 轮询进度，终态后读结果。目标关节角由 `JointPositions` 承载（单位弧度，长度与关节数一致）；`duration` 是期望运动时长，`0` 表示沿用控制器缺省。

```python
from fabot import Robot
from fabot.core import OperationState
from fabot.types import JointPositions

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["left_arm"])

    print("使能:", robot.left_arm.set_enable(True))

    positions = list(robot.left_arm.get_joint().positions)
    positions[1] += 0.2                       # 第 2 个关节转动 0.2 弧度
    op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)

    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.status_message)
        if snap.terminal:
            break

    if snap.state is OperationState.Succeeded:
        print("到位:", snap.result.status_message)
    else:
        print("失败:", snap.error)
```

注意：

- 快照的 `feedback` 为 `Progress`（`progress` / `status_message`），任务刚启动时可能为 `None`；终态 `result` 为 `Outcome`（`success` / `status_message`），失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- 同一只手臂的所有运动 Operation 共享资源 `arm`，策略 `queue`：新任务排队执行；进行中可 `op.cancel()` 取消。
- `op.wait(timeout=30.0)` 是等终态的简写：成功返回 `result`，失败时直接抛错。

## 按末端位姿运动

`move_pose` 以末端位姿为目标：`target` 是 `Pose3d`（`x` / `y` / `z` 米，`qx` / `qy` / `qz` / `qw` 四元数）。参考系取 `target.frame_id`，空串缺省 `arm_base`；`end_frame` 空串缺省当前工具 TCP，无工具时为法兰。

```python
from fabot.types import Pose3d

pose = Pose3d(x=0.3, y=0.0, z=0.4, qw=1.0, frame_id="arm_base")   # 无旋转

op = robot.right_arm.move_pose(pose, position_tolerance=0.01, duration=3.0)
snap = op.get(timeout=30.0)
print(snap.state, snap.result)

# 相对当前位姿移动：
# robot.right_arm.move_pose_relative(Pose3d(x=0.05, qw=1.0))
# 沿路点走：
# robot.right_arm.move_pose_path([pose, Pose3d(x=0.35, z=0.45, qw=1.0)])
```

## 读取六维力并做柔顺控制

`get_wrench()` 读原始六维力，`get_filtered_wrench()` 读滤波后的值；`set_wrench_zero()` 做一次零偏标定。柔顺控制用 `set_compliance_mask` / `set_compliance_wrench` 设置各自由度权重与目标力。

```python
print(robot.right_arm.get_filtered_wrench())
robot.right_arm.set_wrench_zero()            # 空载时标零

robot.right_arm.set_compliance_mask([0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
print(robot.right_arm.get_compliance_mask())
```

## 设置到位阈值

`set_arrival_thresholds` 整体替换该槽位的到位判定阈值；到位要求连续两次采样都落在阈值内。

```python
applied = robot.left_arm.set_arrival_thresholds(
    joint_tolerance=0.01,            # 关节 L2 误差，弧度
    pose_position_tolerance=0.005,   # 位置误差，米
    pose_orientation_tolerance=0.02, # 1 - |dot(q, q_target)|
    max_timeout_s=8.0,               # 追加到位等待，秒
)
print(applied.outcome.success)
if applied.applied is not None:
    print(applied.applied.joint_tolerance, applied.applied.max_timeout_s)
```

## 订阅关节位置流

`joint()` 打开关节状态流，用 `frames()` 迭代帧，用完调用 `close()` 释放。帧的 `payload` 为 `JointState`（`positions` / `velocities` / `efforts` / `stamp_ns`）；末端位姿流用 `pose()`，六维力流用 `wrench()` / `filtered_wrench()`。

```python
ch = robot.left_arm.joint(qos_profile="latest")
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
- [坐标系与变换](../../usage/frames.md)
