---
title: 底盘 Chassis
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 底盘 Chassis

## 模块概述

- 能力 id：`chassis`；槽位：`robot.chassis`
- 底盘运动控制：速度指令、限速设置、站点导航、重定位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `set_velocity` | `vx`, `vy`, `vtheta` | `VelocityAppliedT` | Command |
| `stop` | — | — | Command |
| `pause` / `resume` | — | — | Command |
| `set_max_speed` / `get_max_speed` | `vx`, `vtheta` / — | — / 限速值 | Command |
| `set_max_acceleration` / `get_max_acceleration` | 同上 | 同上 | Command |
| `list_stations` | — | 站点列表 | Command |
| `get_status` | — | 状态 | Command |
| `move_relative` | `dx`, `dy`, `dtheta` | `MoveRelativeOperation` | Operation |
| `navigate_to_station` | `station_id`, `mode: NavigationMode` | `NavigateToStationOperation` | Operation |
| `relocalize` | `pose: Pose2dT` | `RelocalizeOperation` | Operation |

## 方法

### 速度控制

```python
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)   # m/s, rad/s
robot.chassis.stop()
```

### 站点导航（Operation）

长时任务返回 Operation 句柄，快照含 `state` / `feedback: ChassisProgressT` / `result: ChassisOutcomeT` / `error`，用法见 [命令与长时操作](../../usage/commands-operations.md)：

```python
op = robot.chassis.navigate_to_station(station_id="charging", mode=NavigationMode.NAVIGATE)
for snap in op.events(poll_timeout_ms=200, timeout_ms=60000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break
```

### 重定位

```python
from fabot.types import Pose2dT
op = robot.chassis.relocalize(pose=Pose2dT(x=1.0, y=2.0, theta=0.0))
```

## 通道

## 事件

故障与生命周期变化经 `robot.chassis.events` 的 `fault_changed` / `lifecycle_changed` 订阅。

## 异常

## 状态

本模块没有 `status()`；整机状态见 `robot.status()`。

## 资源

导航资源同一时刻只服务一个任务：新任务排队或被拒（抛 `ResourceConflict`）。

!!! todo
    待按 `fabot` 包类型提示核对方法签名、`NavigationMode` 枚举值与资源策略。
