---
title: 语音 Voice
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 语音 Voice

## 模块概述

- 能力 id：`voice`；槽位：`robot.voice`
- 语音交互：唤醒、转写、意图识别走数据通道（输入侧）；语音合成播报、音频播放与音量 / 静音 / 语速 / 发音人控制走方法与 Operation（输出侧）。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `stop` | — | `VoiceStatusAppliedT` | Command |
| `set_volume` | `volume` | `VoiceStatusAppliedT` | Command |
| `set_mute` | `muted` | `VoiceStatusAppliedT` | Command |
| `set_speaker` | `speaker_id` | `VoiceStatusAppliedT` | Command |
| `list_speakers` | — | `SpeakerListT` | Command |
| `set_speaking_rate` | `speaking_rate` | `VoiceStatusAppliedT` | Command |
| `set_wakeword_enabled` | `enabled` | `VoiceStatusAppliedT` | Command |
| `get_status` | — | `VoiceStatusAppliedT` | Command |
| `speak` | `text`, `speaker_id` | `SpeakOperation` | Operation |
| `play_audio` | `uri` | `PlayAudioOperation` | Operation |

Command 默认 `timeout_ms`：`set_volume` / `list_speakers` 为 3000，其余 Command 为 1000（均可覆盖）。`speak` / `play_audio` 默认超时 30000 ms、可取消。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `wake()` | 唤醒事件流（`WakeEventT`） |
| `transcript()` | 语音转写流（`TranscriptEventT`） |
| `intent()` | 意图识别流（`IntentEventT`） |

## 方法

以下均为关键字参数。Command 超时与 Operation 轮询、取消见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### stop

打断当前语音输出，使正在进行的 `speak` / `play_audio` 任务结束。

```python
stop(*, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`（各写命令与 `get_status` 共用）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `status` | `VoiceStatusT` | 应用后的语音状态快照 |

`VoiceStatusT` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `activity` | `int`（`VoiceActivity`） | 当前活动：`UNKNOWN` / `IDLE` / `LISTENING` / `SPEAKING` |
| `volume` | `float` | 线性增益，[0.0, 1.0] |
| `muted` | `bool` | 是否静音 |
| `speakerId` | `str` | 当前发音人 id；空串表示未设置 |
| `speakingRate` | `float` | 语速倍率，1.0 为默认 |
| `wakewordEnabled` | `bool` | 唤醒词检测是否开启 |

```python
applied = robot.voice.stop()
print(applied.outcome.success, applied.status.activity)
```

### set_volume

设置音量（线性增益）。音量与静音相互独立：音量 0.0 不等于静音。

```python
set_volume(*, volume: float, timeout_ms: int = 3000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `volume` | `float` | （必填） | 线性增益，合法范围 [0.0, 1.0]，越界抛 `InvalidArgument` |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.set_volume(volume=0.6)
print(applied.outcome.success, applied.status.volume)
```

### set_mute

静音或取消静音；取消静音恢复静音前的音量。

```python
set_mute(*, muted: bool, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `muted` | `bool` | （必填） | `True` 静音，`False` 取消静音 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.set_mute(muted=True)
print(applied.outcome.success, applied.status.muted)
```

### set_speaker

切换当前发音人。可用发音人见 `list_speakers()`。

```python
set_speaker(*, speaker_id: str, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `speaker_id` | `str` | （必填） | 发音人 id |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.set_speaker(speaker_id="zh-CN-female-1")
print(applied.outcome.success, applied.status.speakerId)
```

### list_speakers

列出可选发音人。

```python
list_speakers(*, timeout_ms: int = 3000) -> SpeakerListT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`SpeakerListT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `speakers` | `list[SpeakerInfoT]` | 发音人列表；每项含 `speakerId` / `locale`（如 `zh-CN`）/ `gender`，后两者空串表示未知 |
| `outcome` | `OutcomeT` | `success` / `statusMessage` |

```python
result = robot.voice.list_speakers()
for spk in result.speakers:
    print(spk.speakerId, spk.locale, spk.gender)
```

### set_speaking_rate

设置语速倍率，与音量相互独立。

```python
set_speaking_rate(*, speaking_rate: float, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `speaking_rate` | `float` | （必填） | 语速倍率，1.0 为默认；合法范围 (0.0, 3.0]，越界抛 `InvalidArgument` |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.set_speaking_rate(speaking_rate=1.2)
print(applied.outcome.success, applied.status.speakingRate)
```

### set_wakeword_enabled

开启或关闭唤醒词检测。

```python
set_wakeword_enabled(*, enabled: bool, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | `True` 开启，`False` 关闭 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.set_wakeword_enabled(enabled=False)
print(applied.outcome.success, applied.status.wakewordEnabled)
```

### get_status

以 Command 方式读取当前语音状态快照。

```python
get_status(*, timeout_ms: int = 1000) -> VoiceStatusAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`VoiceStatusAppliedT`：`outcome` / `status`，字段见 [stop](#stop)。

```python
applied = robot.voice.get_status()
print(applied.status.volume, applied.status.muted, applied.status.speakerId)
```

### speak

合成文本并播报，返回可轮询、可取消的 Operation。

```python
speak(*, text: str, speaker_id: str) -> SpeakOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `text` | `str` | （必填） | 待合成播报的文本 |
| `speaker_id` | `str` | （必填） | 本次播报使用的发音人 id；空串表示沿用当前发音人 |

**返回**

`SpeakOperation`。通过 `get()` / `events()` 取快照，也可 `cancel()`。快照字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | `OperationState` | 任务状态 |
| `terminal` | `bool` | 是否终态 |
| `feedback` | `EmptyT` \| `None` | 无进度内容 |
| `result` | `OutcomeT` \| `None` | `success` / `statusMessage` |
| `error` | `FabotError` \| `None` | 失败原因 |

```python
op = robot.voice.speak(text="你好，世界", speaker_id="")
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state)
    if snap.terminal:
        break
```

### play_audio

播放一个音频资源，返回可轮询、可取消的 Operation。

```python
play_audio(*, uri: str) -> PlayAudioOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 音频资源 URI，如 `file://` 本地文件 |

**返回**

`PlayAudioOperation`。快照字段与 `speak` 相同：`state` / `feedback: EmptyT` / `result: OutcomeT` / `error`，可 `cancel()`。

```python
op = robot.voice.play_audio(uri="file:///opt/fabot/media/ding.wav")
snap = op.get(timeout_ms=30000)
print(snap.state, snap.result)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### wake()

订阅唤醒事件流。

```python
wake(qos_profile: str = "latest") -> WakeChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`WakeChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `WakeEventT` | `payload.keyword`（`str`）：命中的唤醒词；`payload.timestampUs`（`int`）：事件时间戳（微秒） |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.voice.wake(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.keyword)
```

### transcript()

订阅语音转写流。

```python
transcript(qos_profile: str = "latest") -> TranscriptChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`TranscriptChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `TranscriptEventT` | 见下 |

`TranscriptEventT` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `text` | `str` | 转写文本 |
| `isFinal` | `bool` | 是否最终结果（`False` 为中间结果） |
| `confidence` | `float` | 置信度 |
| `timestampUs` | `int` | 事件时间戳（微秒） |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.voice.transcript(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    if frame.payload.isFinal:
        print(frame.payload.text, frame.payload.confidence)
```

### intent()

订阅意图识别流。

```python
intent(qos_profile: str = "latest") -> IntentChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`IntentChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `IntentEventT` | 见下 |

`IntentEventT` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `intentId` | `str` | 意图 id |
| `transcript` | `str` | 对应转写文本 |
| `confidence` | `float` | 置信度 |
| `timestampUs` | `int` | 事件时间戳（微秒） |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.voice.intent(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.intentId, frame.payload.confidence)
```

## 事件

经 `robot.voice.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

本模块没有特有事件流；唤醒、转写、意图走数据通道，见 [通道](#_3)。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.voice.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.voice.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.voice.events.lifecycle_changed.subscribe(callback)`。

**payload**

`LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `lifecycle` | `LifecycleState` | 生命周期阶段 |
| `health` | `HealthState` | 健康度 |
| `source_instance_id` | `str` | 来源实例 id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.voice.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.voice.faults()`，返回 `Faults`。

本模块尚无已命名故障：当前 `Faults` 只有 `revision`。变化通过 `fault_changed` 推送。通用约定见 [状态、故障与生命周期](../../usage/status-faults.md)。

若日后出现已命名故障，每条为 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `active` | `bool` | 是否仍在生效 |
| `catalog_id` | `str` | 目录 id |
| `fault_class` | `CapabilityStateClass` | 故障等级 |
| `first_seen_us` / `last_seen_us` | `int` | 首次 / 最近见到的时间戳（微秒） |
| `count` | `int` | 累计次数 |

## 状态

`status()` 返回 `Status`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `activity` | `Activity` | 语音活动：`Activity.Idle` / `Activity.Listening` / `Activity.Speaking` |

```python
st = robot.voice.status()
print(st.activity)
```

`status()` 只含 `activity`；音量、静音、发音人等完整快照用 `get_status()` Command，见 [方法](#_2)。整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

`speak` 与 `play_audio` 共享同一发音资源：一个播报或播放任务进行中时，新任务被**拒绝**（而非排队）。两个 Operation 默认超时 30 s，可 `cancel()`，也可由 `stop` 命令打断；`stop` 不占用该资源。
