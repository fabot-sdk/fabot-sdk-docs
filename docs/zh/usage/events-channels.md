---
title: 事件与数据通道
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 事件与数据通道

SDK 提供两种被动接收数据的机制：**事件（Event）** 是离散的语义消息（急停触发、故障变化、生命周期切换等），**数据通道（Channel）** 是能力持续推送的数据流（关节位置、相机图像、IO 电平变化等），带 QoS 档位。选择原则：状态迁移类信息订阅事件，高频遥测数据打开通道。

## 事件订阅

事件按来源分三层，订阅入口形态一致，均返回 `SubscriptionToken`：

| 层 | 入口 | 内容 |
|----|------|------|
| 整机 | `robot.events` | 平台事件：急停、整机运行状态、槽位注册、配置、服务状态、整机故障 |
| 能力 | `robot.<slot>.events` | 单个槽位的事件：`fault_changed` / `lifecycle_changed` |
| 日志 | `robot.logs` | 平台与各能力的结构化日志记录流 |

### 订阅与退订

```python
from fabot import Robot

def on_estop(event):  # event: EstopChangedEvent
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

with Robot.connect("192.168.1.10", 7557) as robot:
    token = robot.events.estop_changed.subscribe(on_estop)
    # ...
    token.close()  # 退订；robot.close() 会统一关闭全部订阅
```

- 每个类型化入口（如 `robot.events.estop_changed`）只推送一种事件，回调收到的是解码后的事件对象。
- `subscribe(callback, on_error=...)`：`on_error` 接收投递过程中的错误（如 payload 解码失败，以 `FabotError` 传入）；不传则错误在回调线程抛出。
- `SubscriptionToken`：用 `token.close()` 退订（幂等），`token.is_active` 查询是否仍有效，也可作 `with` 上下文管理器；`robot.close()` 统一关闭全部订阅。

### 事件对象与 EventHeader

每个事件都带 `EventHeader` 元数据：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。类型化事件在 `header` 之外带一个语义 payload 字段（如 `EstopChangedEvent.estop` 为 `EstopState`），字段细节见 [Robot 入口](../reference/python/robot.md)。

### 订阅全部事件（原始事件）

`robot.events.subscribe(callback)` 订阅总线上的全部事件（整机与能力），`robot.<slot>.events.subscribe(callback)` 订阅单个槽位的全部事件。回调收到未解码的原始 `Event`，用事件类型的 `matches()` / `from_event()`（或不匹配时返回 `None` 的 `try_from_event()`）判别并解码：

```python
from fabot.core import EstopChangedEvent

def on_event(event):  # event: Event（原始总线事件）
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        print("estop:", e.estop.asserted, e.estop.reason)

token = robot.events.subscribe(on_event)
```

### 整机事件一览

| 入口 | 事件类型 | payload 字段 |
|------|----------|--------------|
| `robot.events.estop_changed` | `EstopChangedEvent` | `estop`：`EstopState`（`asserted` / `reason` / `source_id` 等） |
| `robot.events.robot_state_changed` | `RobotStateChangedEvent` | `robot_state`：`RobotState` |
| `robot.events.registry_changed` | `RegistryChangedEvent` | `registry`：`RegistryEvent`（`registry_revision` / `capability_id`） |
| `robot.events.config_changed` | `ConfigChangedEvent` | `config`：`ConfigState` |
| `robot.events.service_state_changed` | `ServiceStateChangedEvent` | `service_state`：`ServiceState` |
| `robot.events.faults_changed` | `FaultsChangedEvent` | `faults`：`RobotFaults`（全部槽位故障聚合） |

各 payload 的字段定义见 [Robot 入口](../reference/python/robot.md) 的 events / status 节；状态与故障模型见 [状态、故障与生命周期](status-faults.md)。

### 能力事件

15 个能力模块的事件入口形态一致：

- `robot.<slot>.events.fault_changed`：该槽位故障集合变化，payload 为该模块的 `Faults`（当前各模块 `Faults` 只有 `revision`，尚无已命名故障）。
- `robot.<slot>.events.lifecycle_changed`：该槽位生命周期或健康度变化，payload 为 `CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）。

各模块的事件定义见 API 参考，如 [机械臂 Arm](../reference/python/arm.md)。

### 日志流

`robot.logs.subscribe(callback, min_level=..., slot=...)` 订阅结构化日志：

```python
from fabot.core import LogLevel

def on_log(record):  # record: LogRecord
    print(record.level, record.component, record.message)

token = robot.logs.subscribe(on_log, min_level=LogLevel.Warn, slot="chassis")
```

- `min_level`：`LogLevel.Debug` / `Info` / `Warn` / `Error`，默认 `Info`；`slot` 指定后只收该槽位的日志。
- `LogRecord` 主要字段：`ts_us` / `level` / `component` / `action` / `message` / `trace_id` / `capability_id` 等。

:::warning 回调线程约束
事件与日志回调在 SDK 的 I/O 线程执行：保持轻量、尽快返回。禁止在回调内调用任何阻塞 API（连接工厂方法、Command、`frames()` 迭代等，会抛 `ClientThreadError`），也不要在回调线程里发起新的订阅。需要重处理时投递到自己的队列或线程。
:::

## 数据通道

提供数据通道的能力会生成类型化通道入口，调用即打开通道并返回 Channel 句柄，用 `frames()` 迭代帧：

```python
ch = robot.io.digital_events(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload)
finally:
    ch.close()
```

- 帧统一为四个字段：`channel_id` / `sequence` / `timestamp_us` / `payload`，其中 `payload` 是该通道的类型化数据（见各模块参考页）。
- `frames(poll_timeout_ms=..., timeout_ms=...)` 返回帧迭代器：`poll_timeout_ms` 是单次取帧的等待上限（默认 1000，超时后进入下一轮），`timeout_ms` 是整体时限，到达后抛内置 `TimeoutError`；`timeout_ms=None`（默认）表示不限时。迭代中断（`break` / 异常）后取帧自动停止，但通道本身仍开着，需 `ch.close()` 释放。
- 通道是**租约**：SDK 后台线程自动续租（线程数由 `ClientOptions.channel_renew_threads` 控制，见 [连接与 Robot 入口](connection.md)），`ch.renew()` 可立即手动续租一次；`robot.close()` 统一关闭全部通道。
- 打开通道、`frames()`、`renew()`、`close()` 均为阻塞调用，不得在事件回调线程中执行（抛 `ClientThreadError`）。

### 各能力的通道

| 能力（槽位） | 通道 |
|--------------|------|
| arm（`left_arm` / `right_arm`） | `joints()` / `pose()` |
| arms（`arms`） | `joints()` / `pose()` |
| body（`body`） | `joints()` |
| hand（`left_hand` / `right_hand`） | `joints()` |
| gripper（`left_gripper` / `right_gripper`） | `joints()` |
| head（`head`） | `joints()` |
| motion（`motion`） | `joints()` |
| io（`io`） | `digital_events()` |
| camera（`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`） | `frameset()` / `color()` / `depth()` / `rtsp()` / `webrtc()` |
| voice（`voice`） | `wake()` / `transcript()` / `intent()` |

逐通道的 payload 类型与说明见各模块参考页（[Python API 参考](../reference/python/index.md)）。注意 camera 的 `rtsp()` / `webrtc()` 返回的是预览播放地址（`StreamUrlT`），不走帧迭代。

### QoS 档位

打开通道时 `qos_profile` 为字符串，三档（当前所有通道默认 `"latest"`）：

| 值 | 语义 |
|----|------|
| `"latest"` | 只保留最新帧，消费慢时丢旧帧 |
| `"realtime"` | 最低延迟，允许丢帧 |
| `"reliable"` | 尽力送达 |

传入其他值抛 `ValueError`。

## 事件类型清单

平台事件类型统一定义在 `fabot.core`：`EstopChangedEvent`、`RobotStateChangedEvent`、`RegistryChangedEvent`、`ConfigChangedEvent`、`ServiceStateChangedEvent`、`FaultChangedEvent`、`FaultsChangedEvent`、`LifecycleChangedEvent`、`ManagerConnectionChangedEvent`。各能力模块的 `events` 中还有绑定本模块 `Faults` 类型的 `FaultChangedEvent`，均提供 `matches()` / `from_event()` / `try_from_event()`。

## 相关

- 状态与故障的主动查询：[状态、故障与生命周期](status-faults.md)
- `FabotError` / `ClientThreadError` 等错误类型：[错误处理](errors.md)
- 各模块通道与事件细节：[Python API 参考](../reference/python/index.md)
