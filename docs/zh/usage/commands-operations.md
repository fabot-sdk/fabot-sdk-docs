---
title: 命令与长时操作
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 命令与长时操作

能力槽位暴露两类调用：

- **Command**：同步请求-响应，一次阻塞调用拿到结果或抛错。
- **Operation**：长时、可取消的任务，立即返回句柄，进度靠轮询或事件推进。

各能力的方法在 [API 参考](../reference/python/index.md) 里标注了类型，参数名与默认值以各页的签名块为准。

## Command

Command 是一次阻塞调用：发请求、等响应、返回解码后的结果对象，失败时抛 `FabotError` 子类。

```python
from fabot.capabilities.io import PinDirection

# 位置参数 + 关键字参数混用；每个 command 都有 timeout_ms
robot.io.acquire(17, direction=PinDirection.OUTPUT)
applied = robot.io.set_level(17, value=True)
print(robot.io.get_level(17).value)
robot.io.release(17)

# 底盘速度伺服
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)
```

行为约定：

- 参数在签名里标在 `*` 之前的可以按位置或关键字传入；`*` 之后的只能按关键字传入。
- 超时抛 `Timeout`。每个方法有默认 `timeout_ms`（见各能力参考页），可用调用级参数覆盖，也受 `ClientOptions.command_timeout_ms` 影响。
- 失败抛具体 `FabotError` 子类，携带 `code` / `category` / `retryable` / `trace_id`，见 [错误处理](errors.md)。
- 返回类型是解码后的类型化对象（如 `Outcome` 的 `success` / `status_message`），字段说明见各能力参考页。
- Command 是阻塞调用，禁止在 SDK I/O 线程（事件回调）中执行，见 [事件与数据通道](events-channels.md)。

## Operation

长时任务（机械臂轨迹、底盘导航、语音采集等）立即返回一个 Operation 句柄，不阻塞调用线程：

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.get_station()          # list[StationInfo]
op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
print(op.id)                                    # 任务 id

# 方式一：轮询最新快照
snap = op.get(timeout=1.0)
print(snap.state, snap.terminal)                # OperationState, 是否终态

# 方式二：迭代快照流，随任务推进逐个产出
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break

# 方式三：阻塞等终态，失败时抛错
result = op.wait(timeout=60.0)

snap = op.cancel()                              # 请求取消，返回最新快照
```

各能力的 Operation 句柄方法相同，只是返回的快照类型按能力特化（如 `MoveJointOperation` / `MoveStationOperation` / `ListenOperation`）：

| 成员 | 说明 |
|------|------|
| `id` | 任务 id |
| `get(timeout=None, *, timeout_ms=None)` | 拉取最新快照，最多等待给定时长 |
| `wait(timeout=None, *, timeout_ms=None)` | 等到终态并返回 `result`；`Failed` / `Canceled` / `Timeout` 抛对应异常 |
| `events(poll_timeout_ms=1000, timeout_ms=None)` | 迭代快照流，终态后自动结束；整体超时抛 `Timeout` |
| `cancel()` | 尽力取消任务，返回最新快照 |
| `__iter__` / `with` | 直接迭代等价于 `events()`；上下文管理器退出时关闭事件订阅 |

`timeout` 用秒，`timeout_ms` 用毫秒，两者等价；同时给时 `timeout` 优先。

快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `operation_id` | `str` | 任务 id |
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `updated_at_us` / `sequence` | `int` | 快照时间戳（微秒）与序号 |
| `feedback` | 各能力类型 \| `None` | 进度反馈（机械臂 / 底盘为 `Progress`：`progress` + `status_message`） |
| `result` | 各能力类型 \| `None` | 终态结果（多为 `Outcome`；语音采集为 `CaptureSummary`） |
| `error` | `FabotError` \| `None` | 失败原因 |

`OperationState` 取值：`Unknown` / `Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`。其中 `Succeeded` / `Failed` / `Canceled` / `Timeout` 是终态（`terminal` 为 `True`），终态后不再推进；`Failed` / `Timeout` 时通过 `error` 取失败原因。

## 资源与排队

同一资源上的 Operation 按声明的策略处理：

| 策略 | 行为 |
|------|------|
| `queue` | 新任务排队，等待前序任务结束（机械臂、底盘导航、运动控制、夹爪、灵巧手、躯干、头部、相机开关） |
| `reject` | 资源被占用时立即拒绝（手柄遥操作会话、语音采集与播放） |

资源归属与策略见各能力参考页的「资源」一节。`reject` 策略下被拒绝时，调用处立刻抛 `ResourceConflict`。

## 取消语义

- `cancel()` 是**尽力而为**：已进入执行段的任务由服务端决定是否可中断，取消成功后状态为 `Canceled`。
- 任务可能在取消前已结束：检查 `cancel()` 返回快照的 `state`，若已是 `Succeeded` / `Failed` 等终态，说明任务在取消前已完成。
- 任务在机器人侧运行；SDK 句柄只是观察与控制入口，丢弃句柄不影响服务端任务本身。
- 语音的 `listen()` / `play_audio()`、手柄遥操作的 `start_joystick_control()` 都是以「会话」形式存在的 Operation：取消它就等于结束会话。

## 超时与预算

两套时间概念不要混用：

| 概念 | 位置 | 含义 |
|------|------|------|
| Command 超时 | `timeout_ms` | 单次请求-响应的等待上限 |
| Operation 默认时限 | 各能力契约（如底盘导航 180 秒、运动控制 60 秒、遥操作 45 秒） | 服务端允许任务运行的最长时间，到时自动进入终态 |
| 位姿 / 关节运动的 `duration` | 方法参数 | 期望运动时长；`0` 表示沿用控制器缺省 |
| 到位等待 `wait_timeout` | 方法参数 | 在运动时长之外额外等待到位的上限；`0` 表示沿用缺省策略 |

## 底层句柄（高级用法）

产品层 Proxy 之下是 `SlotHandle`（`fabot.core`）：`command()` / `start_operation()` / `subscribe()`，返回异步 `Future`，payload 为原始字节（`BytesPayload`），配合 `encode_flatbuffer` / `decode_flatbuffer` 使用。普通应用无需直接使用。
