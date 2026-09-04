---
title: 命令与长时操作
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 命令与长时操作

能力槽位暴露两类调用：

- **Command**：同步请求-响应，一次阻塞调用拿到结果或抛错。
- **Operation**：长时、可取消的任务，立即返回句柄，进度靠轮询或事件推进。

两类调用的参数都是关键字参数。各能力的具体方法见 [API 参考](../reference/python/index.md)。

## Command

Command 是一次阻塞调用：发请求、等响应、返回解码后的结果对象，失败时抛 `FabotError` 子类。

```python
# 关键字参数；每个 command 都有 timeout_ms（默认值见各能力参考页）
applied = robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")
print(level.value)

# 底盘限速与速度指令
applied = robot.chassis.set_max_speed(linear=0.5, angular=0.8)
print(applied.appliedLinear, applied.appliedAngular)
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)
robot.chassis.stop()
```

行为约定：

- 超时抛 `Timeout`（错误分类之一，见 [错误处理](errors.md)）。每个方法有默认 `timeout_ms`（见各能力参考页），可用调用级参数覆盖。
- 失败抛具体 `FabotError` 子类，保留 `code` / `category` / `retryable` / `trace_id`。
- 返回类型是解码后的类型化对象（如 `OutcomeT` 的 `success` / `statusMessage`），字段说明见各能力参考页。
- Command 是阻塞调用，禁止在 SDK I/O 线程（事件回调）中执行，见 [事件与数据通道](events-channels.md)。

## Operation

长时任务（如站点导航、相对移动、机械臂轨迹）立即返回一个 Operation 句柄，不阻塞调用线程：

```python
from fabot.capabilities.chassis import NavigationMode

# station_id 来自 list_stations()，是 int
stations = robot.chassis.list_stations().stations
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId, mode=NavigationMode.AUTONOMOUS,
)
print(op.id)                                # 任务 id

# 方式一：轮询最新快照
snap = op.get(timeout_ms=1000)
print(snap.state, snap.terminal)            # OperationState, 是否终态

# 方式二：迭代事件流，随任务推进逐个产出快照
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)        # 进度反馈（如 ChassisProgressT）
    # 到达终态后迭代自动结束

if snap.error is not None: ...              # 失败时的 FabotError
result = snap.result                        # 终态结果（如 ChassisOutcomeT）

snap = op.cancel()                          # 请求取消，返回最新快照
```

各能力的 Operation 句柄方法相同，只是返回的快照类型按能力特化（如 `MoveRelativeOperation` / `NavigateToStationOperation`）：

| 成员 | 说明 |
|------|------|
| `id` | 任务 id |
| `get(timeout_ms=None)` | 拉取最新快照，最多等待 `timeout_ms` 毫秒 |
| `events(poll_timeout_ms=1000, timeout_ms=None)` | 迭代快照流，终态后自动结束；`timeout_ms` 到期仍未终态则抛内置 `TimeoutError` |
| `cancel()` | 尽力取消任务，返回最新快照 |

快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `operation_id` | `str` | 任务 id |
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `updated_at_us` / `sequence` | `int` | 快照时间戳（微秒）与序号 |
| `feedback` | 各能力类型 \| `None` | 进度反馈（如 `ChassisProgressT`） |
| `result` | 各能力类型 \| `None` | 终态结果（如 `ChassisOutcomeT`） |
| `error` | `FabotError` \| `None` | 失败原因 |

`OperationState` 取值：`Unknown` / `Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`。其中 `Succeeded` / `Failed` / `Canceled` / `Timeout` 是终态（`terminal` 为 `True`），终态后不再推进；`Failed` / `Timeout` 时通过 `error` 取失败原因。

同一资源上的 Operation 排队执行、不并发，资源归属见各能力参考页的「资源」一节。

## 取消语义

- `cancel()` 是**尽力而为**：已进入执行段的任务由服务端决定是否可中断，取消成功后状态为 `Canceled`。
- 任务可能在取消前已结束：检查 `cancel()` 返回快照的 `state`，若已是 `Succeeded` / `Failed` 等终态，说明任务在取消前已完成。
- 任务在机器人侧运行；SDK 句柄只是观察与控制入口，丢弃句柄不影响服务端任务本身。

## 底层句柄（高级用法）

产品层 Proxy 之下是 `SlotHandle`（`fabot.core`）：`command()` / `start_operation()` / `subscribe()`，返回异步 `Future`，payload 为原始字节（`BytesPayload`），配合 `encode_flatbuffer` / `decode_flatbuffer` 使用。普通应用无需直接使用。
