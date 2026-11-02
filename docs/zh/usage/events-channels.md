---
title: 事件与数据通道
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 事件与数据通道

SDK 提供两种被动接收数据的机制：**事件（Event）** 是离散的语义消息（急停触发、故障变化、会话状态切换等），**数据通道（Channel）** 是能力持续推送的数据流（关节位置、相机图像等），带 QoS 档位。选择原则：状态迁移类信息订阅事件，高频遥测数据打开通道。

## 事件订阅

事件按来源分三层，订阅入口形态一致，均返回 `SubscriptionToken`：

| 层 | 入口 | 内容 |
|----|------|------|
| 整机 | `robot.events` | 平台事件：急停、整机状态、槽位注册、配置、服务状态、整机故障 |
| 能力 | `robot.<slot>.events` | 单个槽位的事件：`fault_changed` / `lifecycle_changed`，相机与语音另有专属事件 |
| 日志 / 指标 | `robot.logs` / `robot.metrics` | 结构化日志与指标流，见 [日志、指标与可观测性](observability.md) |

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

### 订阅全部事件

`robot.events.subscribe(callback)` 订阅总线上的全部事件，可用 `name` / `slot` 收窄；`robot.<slot>.events.subscribe(callback)` 订阅单个槽位的全部事件。回调收到未解码的原始 `Event`，用事件类型的 `matches()` / `from_event()`（或不匹配时返回 `None` 的 `try_from_event()`）判别并解码：

```python
from fabot.core import EstopChangedEvent

def on_event(event):  # event: Event（原始总线事件）
    if EstopChangedEvent.matches(event):
        e = EstopChangedEvent.from_event(event)
        print("estop:", e.estop.asserted, e.estop.reason)

token = robot.events.subscribe(on_event, name="fabot.estop.changed")
```

### 上报自定义事件

`robot.events.emit(...)` 向事件总线发布自定义事件：可传一个 `Event`，也可传事件名加 payload。

```python
robot.events.emit(
    "app.job.finished",
    code=0,
    attrs=[("job", "pick-42")],
    duration_ms=1200,
)
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `event_or_name` | `Event \| str` | （必填） | 事件对象或事件名 |
| `payload` | 任意 | `None` | 事件载荷 |
| `level` | `LogLevel` | `Info` | 事件级别 |
| `attrs` | 键值对序列 | `None` | 附加属性 |
| `slot` / `capability_id` | `str` | `""` | 归属槽位与能力 |
| `code` / `duration_ms` | `int` | `0` | 诊断码与耗时（毫秒） |
| `trace_id` / `ts_us` | `str` / `int` | `""` / `0` | 链路追踪 id 与时间戳；`0` 表示由 SDK 填充 |

### 整机事件一览

| 入口 | 事件类型 | payload 字段 |
|------|----------|--------------|
| `robot.events.estop_changed` | `EstopChangedEvent` | `estop`：`EstopState`（`asserted` / `reason` / `source_id` 等） |
| `robot.events.robot_state_changed` | `RobotStateChangedEvent` | `robot_state`：`RobotState` |
| `robot.events.registry_changed` | `RegistryChangedEvent` | `registry`：`RegistryEvent`（`registry_revision` / `capability_id`） |
| `robot.events.config_changed` | `ConfigChangedEvent` | `config`：`ConfigState` |
| `robot.events.service_state_changed` | `ServiceStateChangedEvent` | `service_state`：`ServiceState` |
| `robot.events.faults_changed` | `FaultsChangedEvent` | `faults`：`RobotFaults`（按槽位组织的故障袋） |

各 payload 的字段定义见 [Robot 入口](../reference/python/robot.md) 的 events / state 节；状态与故障模型见 [状态、故障与生命周期](status-faults.md)。

### 能力事件

15 个能力模块都提供下面两个事件：

- `robot.<slot>.events.fault_changed`：该槽位故障集合变化，payload 为该模块的 `Faults`（`revision` + `records`）。
- `robot.<slot>.events.lifecycle_changed`：该槽位生命周期或健康度变化，payload 为 `CapabilityLifecycleSnapshot`。

另外三个模块有专属事件：

| 事件 | payload | 说明 |
|------|---------|------|
| `robot.<camera>.events.camera_session_changed` | `SessionState` | 相机会话状态变化（开流、同步、配准、标定代际） |
| `robot.<camera>.events.camera_calibration_changed` | `CameraCalibration` | 标定更新，收到后应重新读取内参与外参 |
| `robot.<camera>.events.camera_device_connection_changed` | `DeviceConnectionEvent` | 设备连断 |
| `robot.voice.events.audio_wake_word_detected` | `WakeEvent` | 检测到唤醒词（`keyword` / `timestamp_us`） |

各模块的事件定义见对应的 API 参考，如 [相机 Camera](../reference/python/camera.md)。

### 日志流

日志与指标流有独立的入口与查询接口，见 [日志、指标与可观测性](observability.md)。

:::warning 回调线程约束
事件、日志与通道回调都在 SDK 的 I/O 线程执行：保持轻量、尽快返回。禁止在回调内调用任何阻塞 API（连接工厂方法、Command、`frames()` 迭代等，会抛 `ClientThreadError`），也不要在回调线程里发起新的订阅。需要重处理时投递到自己的队列或线程。
:::

## 数据通道

提供数据通道的能力会生成类型化通道入口，调用即打开通道并返回 Channel 句柄，用 `frames()` 迭代帧：

```python
ch = robot.left_arm.joint(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.channel_id, frame.sequence, frame.timestamp_us, frame.payload.positions)
finally:
    ch.close()
```

- 帧统一为四个字段：`channel_id` / `sequence` / `timestamp_us` / `payload`，其中 `payload` 是该通道的类型化数据（见各模块参考页）。
- `frames(poll_timeout_ms=1000, timeout_ms=None)` 返回帧迭代器：`poll_timeout_ms` 是单次取帧的等待上限，`timeout_ms` 是整体时限，到达后抛 `Timeout`；`timeout_ms=None`（默认）表示不限时。迭代中断（`break` / 异常）后取帧停止，但通道本身仍开着，需 `ch.close()` 释放。
- `next(timeout=5.0)` 直接返回下一帧的 `payload`，适合只取一帧的场景。
- 通道是**租约**：SDK 后台线程自动续租（线程数由 `ClientOptions.channel_renew_threads` 控制，见 [连接与 Robot 入口](connection.md)），`ch.renew()` 可立即手动续租一次；`robot.close()` 统一关闭全部通道。
- 打开通道、`frames()`、`next()`、`renew()`、`close()` 均为阻塞调用，不得在事件回调线程中执行（抛 `ClientThreadError`）。
- 通道句柄有 `id` 与 `descriptor`（`ChannelDescriptor`：`channel_id` / `stream_schema` / `qos` / `lease_ttl_ms`），也可作 `with` 上下文管理器。

### 各能力的通道

| 能力（槽位） | 通道 |
|--------------|------|
| arm（`left_arm` / `right_arm`） | `joint()` / `pose()` / `wrench()` / `filtered_wrench()` |
| arms（`arms`） | `joint()` / `pose()` |
| body（`body`） | `joint()` / `pose()` |
| hand（`left_hand` / `right_hand`） | `opening()` / `joint()` / `tactile()` |
| gripper（`left_gripper` / `right_gripper`） | `opening()` / `joint()` |
| head（`head`） | `joint()` / `pose()` |
| motion（`motion`） | `joint()` / `wbc_state()` / `center_of_mass()` |
| chassis（`chassis`） | `pose()` / `twist()` / `stage()` |
| camera（5 个相机槽位） | `frameset()` / `color()` / `depth()` / `registered_depth()` / `infrared()` / `infrared_left()` / `infrared_right()` / `confidence()` / `points()` / `imu()` / `rtsp()` / `webrtc()` |
| voice（`voice`） | `wake()` / `capture()` / `playback()` |
| skills.camera_sync | `sync_groups()` / `synced_frames()` |

逐通道的 payload 类型与说明见各模块参考页（[Python API 参考](../reference/python/index.md)）。注意相机的 `rtsp()` / `webrtc()` 通道推送的是媒体端点描述（`MediaEndpoint`），不走帧迭代。

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

`robot.events.FaultsChangedEvent`（从 `fabot.robot` 导入）是同一个事件的产品层变体：payload 是类型化的 `RobotFaults` 而不是扁平的 `RobotFaultSnapshot`。

## 相关

- 状态与故障的主动查询：[状态、故障与生命周期](status-faults.md)
- 日志与指标：[日志、指标与可观测性](observability.md)
- `FabotError` / `ClientThreadError` 等错误类型：[错误处理](errors.md)
- 各模块通道与事件细节：[Python API 参考](../reference/python/index.md)
