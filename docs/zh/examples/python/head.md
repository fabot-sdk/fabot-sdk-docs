---
title: 头部运动
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 头部运动

控制头部俯仰 / 偏航关节，并跟踪运动进度。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [头部](../../reference/python/head.md)。

## 转动头部到目标关节角

`move_joints` 返回长时 Operation：通过 `events()` 持续取进度快照，终态后读取结果。目标关节角 `positions` 为弧度列表；`wait=True` 时任务等到到位或超时再结束。运动快慢由插值时长决定：先用 `set_velocity` 设置（秒，越大越慢），对所有后续运动持久生效。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    applied = robot.head.set_velocity(velocity=2.0)
    print("插值时长已生效:", applied.appliedVelocity, "s")

    target = [0.3, 0.5]   # 目标关节角（弧度）
    op = robot.head.move_joints(positions=target, wait=True)
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

- 进度快照的 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），任务刚启动时可能为 `None`。
- 终态快照的 `result` 为 `OutcomeT`（`success` / `statusMessage`）；失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- `move_joints` 占用头部运动资源，同一槽位上的新任务排队执行，不并发。

## 订阅关节位置流

运动过程中可订阅 `joints()` 通道实时观察关节角变化；通用通道约定见 [事件与数据通道](../../usage/events-channels.md)。

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head"])

    ch = robot.head.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

注意：

- `qos_profile` 是字符串（`"latest"` / `"realtime"` / `"reliable"`），不是枚举。
- 帧的 `payload` 为 `JointPositionsT`，`payload.positions` 是关节角列表（弧度）；`timeout_ms` 到期后迭代自然结束，记得 `close()` 释放通道。

## 查询关节角与到位检查

`get_joints` 读取当前关节角，`check_arrive` 检查是否到达目标：

```python
positions = robot.head.get_joints()
print("当前关节角:", positions)
print("当前插值时长:", robot.head.get_velocity(), "s")

arrived = robot.head.check_arrive(threshold=0.05, target_joints=[])
print("已到位:", arrived)
```

`threshold` 是关节空间 L2 容差（弧度）；`target_joints` 传空列表时使用最近一次 `move_joints` 下发的目标。

## 相关链接

- [头部 API 参考](../../reference/python/head.md)
- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
