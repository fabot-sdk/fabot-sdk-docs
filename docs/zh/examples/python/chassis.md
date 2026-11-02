---
title: 导航
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 导航

执行底盘导航任务并跟踪进度。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [底盘](../../reference/python/chassis.md)。

## 导航到站点

`move_station` 返回长时 Operation：通过 `events()` 持续取进度快照，终态后读取结果。目标站点用整数 id 指定，取自 `get_station()`；`mode` 缺省 `AUTONOMOUS`，也可选 `LINE_FOLLOW` / `POINT_TO_POINT`。

```python
from fabot import Robot
from fabot.capabilities.chassis import NavigationMode
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    stations = robot.chassis.get_station()
    if not stations:
        raise RuntimeError("地图上没有导航站点")
    for station in stations:
        print(station.id, station.name, station.pose)

    op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=120000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.status_message)
        if snap.terminal:
            break

    if snap.state is OperationState.Succeeded:
        print("到达:", snap.result.status_message)
    else:
        print("失败:", snap.error)
```

注意：

- 进度反馈的 `feedback` 为 `Progress`（`progress` / `status_message`），任务刚启动时可能为 `None`。
- 终态 `result` 为 `Outcome`；失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- 导航 Operation 共享资源 `chassis`，策略 `queue`，默认时限 180 秒，见 [底盘](../../reference/python/chassis.md)。

## 按位姿导航

除了站点，还可以直接给地图系位姿或车体系相对位移：

```python
from fabot.types import Pose2d

# 地图系绝对位姿（theta 为航向，弧度）
robot.chassis.move_pose(Pose2d(x=1.2, y=0.4, theta=1.57), position_tolerance=0.05).wait(timeout=120.0)

# 车体系相对位移：target.x / y / theta 即 dx / dy / dyaw
robot.chassis.move_pose_relative(Pose2d(x=0.5, y=0.0, theta=0.0)).wait(timeout=120.0)
```

## 速度伺服与手动模式

短距离调整可以用速度伺服。`ChassisMode.MANUAL` 下才允许 `servo_twist`：

```python
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)     # 停
print(robot.chassis.get_twist())
```

## 取消与暂停

导航进行中可以取消，或用 `set_pause()` 暂停与恢复；暂停不会销毁 `move_*` 句柄：

```python
op = robot.chassis.move_station(stations[0].id)

snap = op.cancel()
print(snap.state)   # OperationState.Canceled

# 或临时停车、确认安全后继续：
robot.chassis.set_pause(paused=True)
robot.chassis.set_pause(paused=False)
```

## 查询底盘状态

导航前后可读位姿、速度与运动阶段：

```python
pose = robot.chassis.get_pose()          # Pose2d
print(pose.x, pose.y, pose.theta, pose.frame_id)

twist = robot.chassis.get_twist()        # Twist2d
print(twist.vx, twist.vy, twist.vtheta)

stage = robot.chassis.get_stage()        # ChassisStage
print(stage)                             # IDLE / MOVING / PAUSED / FAULTED
```

`ChassisStage` 是只读运动阶段，由任务与故障投影产生，没有对应的 set 方法。驻停与锁止另有 `get_parking()` / `set_parking()` 与 `get_lock()` / `set_lock()`。字段全表见 [底盘](../../reference/python/chassis.md)。
