---
title: 运动
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 运动

查询与切换全身运动控制体制，读取全身控制状态与质心稳定裕度，并执行回零与全身运动。命令与超时模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口全表见 [运动](../../reference/python/motion.md)。

## 查询与切换运动体制

`get_mode` / `set_mode` 均为 Command。`MotionMode` 枚举为 `HOLD` / `OCS2` / `MOVEJ` / `COMPLIANCE`；`COMPLIANCE` 在当前控制栈上没有可进入的顺应状态，`set_mode` 会被拒绝。

```python
from fabot import Robot
from fabot.capabilities.motion import MotionMode

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["motion"])

    print("当前体制:", robot.motion.get_mode())

    if robot.motion.get_mode() is not MotionMode.OCS2:
        applied = robot.motion.set_mode(MotionMode.OCS2)
        print("切换到:", applied)
```

注意：

- `set_mode` 返回实际生效的体制，可能与请求不同，以返回值为准；该命令默认超时 7 秒（切换需要等控制器确认）。
- 五个运动 Operation（`move_home` / `move_preset` / `move_joint` / `move_joint_path` / `move_pose`）共享资源 `motion_controller`，策略 `queue`，默认时限 60 秒。

## 读取全身控制状态与质心

`get_wbc_state()` 给出各部位约束模式与使能情况，`get_center_of_mass()` 给出质心投影与稳定裕度：

```python
wbc = robot.motion.get_wbc_state()
print(wbc.body_mode, wbc.head_mode, wbc.arms_mode)
print(wbc.left_arm_enabled, wbc.right_arm_enabled, wbc.chassis_locked)

com = robot.motion.get_center_of_mass()
print(com.position, com.status, com.min_safe_margin)   # status 为 SupportStatus
```

## 回零

`move_home` 回到预设零位，`HomePose.PRIMARY` 是默认目标：

```python
from fabot.capabilities.motion import HomePose

robot.motion.move_home(HomePose.PRIMARY, duration=5.0).wait(timeout=60.0)
```

`move_preset` 按具名预设构型运动，名字由机器人配置定义：

```python
robot.motion.move_preset("carry", duration=4.0).wait(timeout=60.0)
```

## 全身关节与位姿目标

`move_joint` 接受 `WholeBodyJointTarget`：四个部位可选，缺省表示保持当前关节角。

```python
from fabot.capabilities.motion import WholeBodyJointTarget
from fabot.types import JointPositions

target = WholeBodyJointTarget(
    left_arm=JointPositions(positions=[0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0]),
    body=JointPositions(positions=[0.0, 0.05, 0.0, 0.0]),
)
robot.motion.move_joint(target, duration=3.0).wait(timeout=60.0)

# 全身位姿伺服（短周期）
# robot.motion.servo_pose(left_arm=left_pose, right_arm=right_pose, body=body_pose)
```

## 读取一次全身关节并订阅流

只取一次快照用 `get_joint()`；持续跟踪用 `joint()` 通道，帧的 `payload` 为 `WholeBodyJointState`（`body` / `left_arm` / `right_arm` / `head` 各一个 `JointState`）：

```python
state = robot.motion.get_joint()
print(state.left_arm.positions, state.body.positions)

ch = robot.motion.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.left_arm.positions)
finally:
    ch.close()
```

另有 `wbc_state()` 与 `center_of_mass()` 两条通道，分别推送 `WbcState` 与 `CenterOfMass`。
