---
title: 遥操作
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 遥操作

建立与停止手柄遥操作会话。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [遥操作](../../reference/python/teleop.md)。

## 开始手柄遥操作会话

`start_joystick_control` 返回长时 Operation：会话进行中持续接收远端控制数据，通过 `events()` 轮询进度快照，终态后读取结果。取消 Operation 等价于结束会话。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["teleop"])

    op = robot.teleop.start_joystick_control()
    for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("会话正常结束:", snap.result.statusMessage)
    else:
        print("会话异常结束:", snap.error)
```

注意：

- 快照的 `feedback` 为 `ProgressT`（`progress` / `statusMessage`），会话刚建立时可能为 `None`。
- 终态快照的 `result` 为 `OutcomeT`（`success` / `statusMessage`）；失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- 会话有默认时限，到时任务自动进入终态；遥操作是独占资源，同一时间只允许一个会话，见 [遥操作](../../reference/python/teleop.md)。

## 停止遥操作会话

需要主动结束会话时调用 `stop_joystick_control`，它是一条 Command，直接返回结果：

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.statusMessage)
```

注意：

- 会话进行中再次调用 `start_joystick_control` 会被直接拒绝（不排队），须先 `stop_joystick_control` 或等会话结束再发起。
- 持有 Operation 句柄时也可以用 `op.cancel()` 结束会话，返回的终态快照中 `state` 为 `OperationState.Canceled`。
- 本模块没有数据通道；会话的生命周期变化可订阅 `robot.teleop.events.lifecycle_changed`，用法见 [事件与数据通道](../../usage/events-channels.md)。
