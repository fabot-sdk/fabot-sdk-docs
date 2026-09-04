---
title: 导航
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 导航

执行导航任务并跟踪进度。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [底盘](../../reference/python/chassis.md)。

## 导航到站点

`navigate_to_station` 返回长时 Operation：通过 `events()` 持续取进度快照，终态后读取结果。目标站点用整数 `station_id` 指定，取自 `list_stations()`；导航模式 `mode` 必填，取值 `AUTONOMOUS`（自主导航）/ `LINE_FOLLOW`（循线）/ `POINT_TO_POINT`（点到点）。

```python
from fabot import Robot
from fabot.capabilities.chassis import NavigationMode
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["chassis"])

    stations = robot.chassis.list_stations().stations
    if not stations:
        raise RuntimeError("地图上没有导航站点")
    for station in stations:
        print(station.stationId, station.name)

    op = robot.chassis.navigate_to_station(
        station_id=stations[0].stationId,
        mode=NavigationMode.AUTONOMOUS,
    )
    for snap in op.events(poll_timeout_ms=200, timeout_ms=120000):
        if snap.feedback is not None:
            print("进度:", snap.feedback.progress, snap.feedback.statusMessage)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("到达:", snap.result.statusMessage)
    else:
        print("失败:", snap.error)
```

注意：

- 进度快照的 `feedback` 为 `ChassisProgressT`（`progress` / `statusMessage` / `taskId`），任务刚启动时可能为 `None`。
- 终态快照的 `result` 为 `ChassisOutcomeT`（`success` / `statusMessage` / `taskId`）；失败原因读 `error`，错误处理见 [错误处理](../../usage/errors.md)。
- 底盘任务共享同一资源，新任务排队执行，不并发，见 [底盘](../../reference/python/chassis.md)。

## 取消与暂停

导航进行中可以取消，或用 `pause()` / `resume()` 暂停与恢复：

```python
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId,
    mode=NavigationMode.AUTONOMOUS,
)

# 需要中止任务时：
snap = op.cancel()
print(snap.state)   # OperationState.Canceled

# 或临时停车、确认安全后继续：
robot.chassis.pause()
# ... 确认周围环境安全
robot.chassis.resume()
```

## 查询底盘状态

导航前后可用 `get_status()` 读取位姿、速度与运动状态快照：

```python
status = robot.chassis.get_status()
print(status.motionState, status.targetStationId)
print(status.pose.x, status.pose.y, status.pose.theta)
```

`pose` 为 `Pose2dT`（`x` / `y` 米，`theta` 弧度），字段全表见 [底盘 get_status](../../reference/python/chassis.md#get_status)。
