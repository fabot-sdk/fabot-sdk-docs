---
title: 灵巧手
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 灵巧手

控制灵巧手关节开合，读取五指触觉阵列，并订阅开合度与触觉流。左右手是同一套 API、各自独立的槽位（`robot.left_hand` / `robot.right_hand`）。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [灵巧手](../../reference/python/hand.md)。

## 控制手指开合

速度与力上限是持久设置；开合度与关节角都是按控制器 `joints` 顺序排列的列表。开合度 0 表示控制器关闭配置、1 表示打开配置。

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["right_hand"])

    n = len(robot.right_hand.get_opening())
    robot.right_hand.set_velocity_limit([0.5] * n)
    robot.right_hand.set_force_limit([20.0] * n)

    opening = [1.0] * n                       # 全部张开
    op = robot.right_hand.move_opening(opening, duration=2.0)
    snap = op.get(timeout=10.0)
    print(snap.state is OperationState.Succeeded, robot.right_hand.get_opening())
```

手的运动 Operation 共享资源 `hand`，策略 `queue`。

## 关节弧度控制

`move_joint` 的目标是弧度列表（长度与手控制器 `joints` 一致），`tolerance` 单位也是弧度；`duration` 取 0 时用槽位 `max_timeout_s`（默认 10 秒）。

```python
joints = list(robot.right_hand.get_joint().positions)
joints[0] += 0.3
robot.right_hand.move_joint(joints, tolerance=0.05).wait(timeout=10.0)
```

需要走关节路点时用 `move_joint_path`，路点是 `JointPositions` 列表：

```python
from fabot.types import JointPositions

robot.right_hand.move_joint_path(
    [JointPositions(positions=joints), JointPositions(positions=[0.0] * len(joints))],
    duration=3.0,
).wait(timeout=15.0)
```

## 读取触觉阵列

`get_tactile()` 返回 `HandTactile`，五指各一个 `FingerTactile`（`rows` / `cols` / `values`（行主序）/ `total_force`）：

```python
tactile = robot.right_hand.get_tactile()
print(tactile.timestamp_us)
for finger in ("thumb", "index", "middle", "ring", "pinky"):
    pad = getattr(tactile, finger)
    if pad is not None:
        print(finger, pad.total_force, len(pad.values))
```

## 订阅流

`opening()` 推送 `Doubles`（各关节开合度），`joint()` 推送 `JointState`，`tactile()` 推送 `HandTactile`：

```python
ch = robot.right_hand.tactile(qos_profile="realtime")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.index.total_force)
finally:
    ch.close()
```
