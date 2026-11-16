---
title: 升降柱示例
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 升降柱示例

`robot.lift` 控制升降柱的高度。机制与完整签名见 [升降柱 Lift](../../reference/python/lift.md)。

## 连接后确认可用

升降柱不是所有机型都装。先判断 `has_adapter`，再读状态：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    if not robot.lift.has_adapter:
        raise SystemExit("this robot has no lift")
    st = robot.lift.get_height()
    print("height:", st.height, "homed:", st.homed, "enabled:", st.enabled)
```

未绑定时 `get_height()` 仍会下发并失败或超时；`has_adapter` 是唯一可靠的前置判断。

## 使能 → 回零 → 定位

首次上电通常需要先回零，之后才能接受绝对高度目标：

```python
if robot.lift.has_adapter:
    robot.lift.set_enable(True)
    if not robot.lift.get_height().homed:
        robot.lift.move_home().wait(timeout=30.0)

    op = robot.lift.move_height(0.45, tolerance=0.005)
    snap = op.get(timeout=20.0)
    print(snap.state, snap.feedback.progress if snap.feedback else None)
```

`move_height` 返回 Operation：`get()` 拉快照、`wait()` 等终态、`cancel()` 尽力取消。模型见 [命令与长时操作](../../usage/commands-operations.md)。

## 相对升降与限速

```python
robot.lift.set_velocity_limit(0.1)          # 米/秒，持久生效
robot.lift.move_height_relative(-0.05).wait(timeout=10.0)
```

限速是持久设置，写一次对后续所有运动生效。抓取高度差小、需要精确时先降速再动。

## 跟踪外部高度指令

`servo_height()` 是短周期伺服，适合跟随外部传感器或手柄：

```python
for target in stream_from_your_source():
    robot.lift.servo_height(target)
```

:::warning 伺服不会自动停
`servo_height()` 每调用一次只下发一个目标。必须在结束时显式 `stop()`；断线不代表升降柱会停。见 [伺服与安全](../../usage/concurrency-and-safety.md)。
:::

## 读高度流

```python
ch = robot.lift.height(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.height, frame.payload.moving)
finally:
    ch.close()
```

## 常见失败

| 现象 | 原因 | 处理 |
|------|------|------|
| 运动命令被拒绝 | 未 `set_enable(True)` | 先使能，再下发运动 |
| 绝对高度目标被拒绝 | 未回零（`homed` 为 `False`） | 先 `move_home()` |
| `move_height` 长时间 `Queued` | 同资源上有前序 Operation | 等前序结束，或 `cancel()` 它 |
| 高度读数整体偏移 | 有人调用了 `set_height_zero()` | 重新回零并核对零点定义 |
