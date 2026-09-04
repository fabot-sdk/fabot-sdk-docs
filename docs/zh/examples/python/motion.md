---
title: 运动
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 运动

查询与切换整机运控状态机（FSM），并订阅关节位置流。命令与超时模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [运动](../../reference/python/motion.md)。

## 查询与切换运控状态机

`get_fsm_state` / `set_fsm_state` 均为 Command。FSM 状态为 `FsmState` 枚举：`Home` / `Hold` / `Ocs2` / `MoveJ`；`set_fsm_state` 返回实际生效的状态：

```python
from fabot import Robot
from fabot.capabilities.motion import FsmState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["motion"])

    state = robot.motion.get_fsm_state()
    print("当前状态:", state)

    if state != FsmState.Hold:
        applied = robot.motion.set_fsm_state(state=FsmState.Hold)
        print("切换到:", applied)
```

注意：

- `set_fsm_state` 的返回是生效后的 `FsmState`，可能与请求不同，以返回值为准。
- `set_fsm_state` 与 `reset_fsm` 占用整机运动控制资源，执行期间另一个同类调用会被直接拒绝而非排队；状态异常时用 `reset_fsm` 复位（默认超时 30 秒），见 [运动](../../reference/python/motion.md)。
- 身体约束模式用 `set_body_mode(mode="BODY_RELATIVE")` 等设置，模式名为大小写敏感的字符串。

## 订阅关节位置流

`joints()` 打开整机关节位置通道，用 `frames()` 迭代帧，用完必须 `close()`：

```python
ch = robot.motion.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        for joint in frame.payload.positions:
            print(frame.sequence, joint.name, joint.position)
finally:
    ch.close()
```

帧的 `payload` 为 `NamedJointsT`（`positions`：`list[JointPositionT]`，每项 `name` / `position`，单位弧度）；`qos_profile` 是字符串（`"latest"` / `"realtime"` / `"reliable"`），不是枚举。

## 读取一次关节角并停止运动

只取一次快照用 `get_joints()`；需要立刻停下当前运动用 `stop()`，它返回 `OutcomeT`：

```python
for joint in robot.motion.get_joints():
    print(joint.name, joint.position)

outcome = robot.motion.stop()
print(outcome.success, outcome.statusMessage)
```

`get_joints` 与 `stop` 不占用运动控制资源，可随时调用。
