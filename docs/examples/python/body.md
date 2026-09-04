---
title: 躯干
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 躯干

控制躯干关节与腰部升降 / 旋转。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [躯干 Body](../../reference/python/body.md)。

## 腰部相对升降

`move_waist` 返回长时 Operation：`mode=RELATIVE` 表示相对增量，纯升降时 `x=0, phi=0`，只给 `z`（米）；`wait=True` 时任务等到到位或超时再结束。通过 `events()` 轮询进度快照，终态后读 `result` / `error`。

```python
from fabot import Robot
from fabot.capabilities.body import WaistMoveMode
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    op = robot.body.move_waist(
        mode=WaistMoveMode.RELATIVE, x=0.0, z=0.05, phi=0.0, wait=True,
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

- 快照 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），任务刚启动时可能为 `None`；终态 `result` 为 `OutcomeT`（`success` / `statusMessage`）。
- `mode=ABSOLUTE` 时 `x` / `z` 是 `base_footprint` 下的绝对位姿、`phi` 为躯干朝向角（弧度）。
- `move_joints` / `move_waist` 共享同一躯干资源，新任务排队执行，见 [躯干 Body](../../reference/python/body.md)。

## 速度比例控制升降

`set_waist_lift_velocity` 按归一化比例 `[-1, 1]` 驱动腰部升降：正上升、负下降，松手后发 `0` 停止。返回 `WaistLiftVelocityAppliedT`，可读取实际生效值。

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    applied = robot.body.set_waist_lift_velocity(velocity_scale=0.5)
    print("生效:", applied.outcome.success, "速度比例:", applied.appliedVelocityScale)

    # ... 到达目标高度后停止
    stop = robot.body.set_waist_lift_velocity(velocity_scale=0.0)
    print(stop.outcome.statusMessage)
```

腰部旋转用 `set_waist_turn_velocity`，参数与返回字段相同；关节插值时长用 `set_velocity`（秒，越大运动越慢）。

## 订阅关节位置流

`joints()` 打开关节位置通道，用 `frames()` 迭代帧，用完 `close()` 释放。帧的 `payload.positions` 为各关节角（弧度）。

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["body"])

    ch = robot.body.joints(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            print(frame.sequence, frame.payload.positions)
    finally:
        ch.close()
```

帧字段（`channel_id` / `sequence` / `timestamp_us` / `payload`）与 `qos_profile` 取值（`"latest"` / `"realtime"` / `"reliable"`）见 [躯干 Body joints](../../reference/python/body.md#joints)。

## 相关链接

- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
- [躯干 Body API 参考](../../reference/python/body.md)
