---
title: 遥操作
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 遥操作

建立与停止手柄遥操作会话。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [遥操作](../../reference/python/teleop.md)。

## 开始手柄遥操作会话

`start_joystick_control` 返回长时 Operation：会话进行中持续接收远端控制数据，通过 `events()` 轮询进度快照，终态后读取结果。取消 Operation 等价于结束会话。

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["teleop"])

    op = robot.teleop.start_joystick_control()
    print("会话 id:", op.id)

    for snap in op.events(poll_timeout_ms=500, timeout_ms=60000):
        print(snap.state, snap.feedback)
        if snap.terminal:
            break

    print(snap.state is OperationState.Succeeded, snap.result)
```

注意：

- 会话有 45 秒默认时限，到时任务自动进入终态。
- 资源 `joystick_control` 的策略是 `reject`：会话进行中再次 `start_joystick_control()` 会被立即拒绝（抛 `ResourceConflict`），不排队。

## 取消会话

```python
op = robot.teleop.start_joystick_control()
# ... 手柄操作 ...
snap = op.cancel()
print(snap.state)          # OperationState.Canceled
```

`cancel()` 是尽力而为：若会话已自然结束，返回的快照会是 `Succeeded` 等终态。

## 主动停止

`stop_joystick_control()` 是短命令，返回 `Outcome`：

```python
outcome = robot.teleop.stop_joystick_control()
print(outcome.success, outcome.status_message)
```
