---
title: 升降柱示例
status: draft
owner: fabot-core
updated: 2026-11-19
---

# 升降柱示例

`robot.lift` 控制升降柱的高度。机制与完整签名见 [升降柱 Lift](../../reference/python/lift.md)。

## 连接后确认可用

升降柱不是所有机型都装。先判断 `has_adapter`，再读状态：

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    if not robot.lift.has_adapter:
        raise SystemExit("this robot has no lift")
    st = robot.lift.get_height()
    print("height:", st.height, "homed:", st.homed, "enabled:", st.enabled)
```

未绑定时 `get_height()` 仍会下发并失败或超时；`has_adapter` 是唯一可靠的前置判断。

## 回零 → 定位

绝对高度命令在 `require_homed: true`（模板缺省）时要求 `get_height().homed` 为真。`homed` 是软件标志，`move_home` 或 `set_height_zero` 成功后写入 `home.yaml`，断电后仍在；绝对值编码器上电即真实位置，标志在时直接发高度命令。标志只在编码器故障 `0x7321`–`0x7328` 后消失，此时用 `move_home` 按原点开关重建，或在已知机械位置调用 `set_height_zero`。`require_homed: false` 时未回零也可发高度命令。

命令下发时底层自行完成故障恢复并进入 Operation Enabled，无需先调 `set_enable(True)`（它只使能、不运动）；`set_enable(False)` 用于卸力矩。

省略 `duration` / `wait_timeout` / `mode` 时，服务端按 `default_wait_timeout_s`（模板 15 秒）计算预算；也可用 `mode=TimingMode.DURATION` 指定预算，或 `mode=VELOCITY` 临时指定速度（米/秒）。`wait(timeout=...)` / `get(timeout=...)` 只限客户端这次等待，不加长运动；要加时就把秒数传给命令自己的 `wait_timeout`。模板行程 `0`–`0.30` m（`min_height_m` / `max_height_m`），目标必须落在其中。

```python
if robot.lift.has_adapter:
    if not robot.lift.get_height().homed:
        robot.lift.move_home(wait_timeout=30).wait(timeout=35)

    op = robot.lift.move_height(0.20, tolerance=0.005, wait_timeout=20)
    snap = op.get(timeout=1.0)
    print(snap.state, snap.feedback.progress if snap.feedback else None)
    outcome = op.wait(timeout=25)
    print(outcome.success, outcome.status_message)
```

`move_height` 返回 Operation：`get()` 拉一次快照，`wait()` 等到终态，`cancel()` 尽力取消。模型见 [命令与长时操作](../../usage/basics/commands-operations.md)。`has_adapter` 只表示这个槽绑了适配器。

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
`servo_height()` 每调用一次只下发一个目标。必须在结束时显式 `stop()`；断线不代表升降柱会停。见 [伺服与安全](../../usage/basics/concurrency-and-safety.md)。
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
| 运动命令被拒绝 | 通信断开、急停按下或目标超出行程 | 读 `status()` 与 `fault_code`；位置命令会自行使能，不必先 `set_enable` |
| 绝对高度目标被拒绝 | `require_homed` 为真且 `homed` 为 `False` | 先 `move_home()`，或在已知机械位置 `set_height_zero()` |
| 回零或到位超时 | 服务端预算仍是 `default_wait_timeout_s` | 把秒数传给命令自己的 `wait_timeout`，客户端 `wait(timeout=...)` 不加长运动 |
| `move_height` 长时间 `Queued` | 同资源上有前序 Operation | 等前序结束，或 `cancel()` 它 |
| 高度读数整体偏移 | 有人调用了 `set_height_zero()` | 重新回零并核对零点定义 |
