---
title: 双臂运动
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 双臂运动

控制双臂按关节角或末端位姿运动，并订阅关节位置流。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [双臂](../../reference/python/arms.md)。

## 关节运动到目标角度

先读取当前关节角，微调其中一个关节后下发 `move_joints`，通过 `events()` 轮询进度直至终态。`positions` 为左臂 + 右臂关节角依次拼接（常见 14 个），单位弧度。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["arms"])

    positions = robot.arms.get_joints()
    print("当前关节角:", positions)
    positions[1] += 0.2  # 左臂第 2 个关节转动 0.2 弧度

    op = robot.arms.move_joints(positions=positions, wait=True)
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

- `wait=True` 表示任务等到到位或超时才结束。
- 进度快照的 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），任务刚启动时可能为 `None`；终态 `result` 为 `OutcomeT`（`success` / `statusMessage`），失败原因读 `error`，见 [错误处理](../../usage/errors.md)。
- `move_joints` / `move_dual_arm_pose` / `move_dual_arm_path` 共享同一资源，新任务排队执行。

## 双臂末端运动到指定位姿

`move_dual_arm_pose` 让两臂末端同时平滑到位：`poses` 长度必须为 2（依次左臂、右臂），`frame_id` 指定参考坐标系（`arm_base` / `base_footprint` / `body_link4`）。这里基于 `get_pose()` 读到的当前位姿整体抬高 5 厘米，并用 `get()` 一次等终态：

```python
current = robot.arms.get_pose()
print("参考系:", current.frameId)
left, right = current.poses
print("左臂末端:", left.x, left.y, left.z)

left.z += 0.05   # 左臂末端抬高 5 厘米
right.z += 0.05
op = robot.arms.move_dual_arm_pose(poses=[left, right], wait=True, frame_id="arm_base")
snap = op.get(timeout_ms=30000)
if snap.result is not None:
    print(snap.state, snap.result.success, snap.result.statusMessage)
else:
    print(snap.state, snap.error)
```

末端位姿为 `Pose3dT`：`x` / `y` / `z` 单位米，`qx` / `qy` / `qz` / `qw` 为姿态四元数。双臂笛卡尔运动只走 `move_dual_arm_*`，不要与单臂接口并行使用。

## 订阅关节位置流

`joints()` 打开双臂关节位置通道，用 `frames()` 迭代帧，用完 `close()`：

```python
ch = robot.arms.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.positions)
finally:
    ch.close()
```

`payload` 为 `JointPositionsT`，`payload.positions` 是左臂 + 右臂拼接的关节角（弧度）。位姿流用 `pose()` 通道，帧结构见 [双臂](../../reference/python/arms.md)。

## 相关链接

- [双臂 API 参考](../../reference/python/arms.md)
- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
