---
title: 语音 Voice
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 语音 Voice

## 模块概述

- 能力 id：`voice`；槽位：`robot.voice`
- 能力域：`interaction`；能力版本：`1.1.0`
- 语音硬件能力：状态与音量、唤醒词、麦克风采集会话与扬声器播放会话，都是流式接口。
- 采集用 `listen` + `capture()` 通道，播放用 `play_audio` / `begin_playback` + `write_audio` + `playback()` 通道。

语义能力（转写、意图识别、语义播报）在技能 `robot.skills.voice_aiui`，不在本模块；见 [技能与扩展](../../usage/skills.md)。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `stop` | Command | 停止当前播放或采集；默认超时 1000 ms。 |
| `set_volume` | Command | 设置音量，取值 0–1；默认超时 3000 ms。 |
| `set_mute` | Command | 静音或取消静音；默认超时 1000 ms。 |
| `set_wakeword_enabled` | Command | 启用或停用唤醒词；默认超时 1000 ms。 |
| `get_status` | Command | 读取语音状态快照（`get_state` 是别名）；默认超时 1000 ms。 |
| `stop_capture` | Command | 停止指定采集会话；默认超时 3000 ms。 |
| `begin_playback` | Command | 开始流式播放会话，随后用 `write_audio` 推流；默认超时 3000 ms。 |
| `write_audio` | Command | 写入一块音频；`final=True` 表示最后一块；默认超时 3000 ms。 |
| `listen` | Operation | 采集一段语音，返回可取消的 Operation，终态结果为 `CaptureSummary`；默认时限 60 秒。 |
| `play_audio` | Operation | 播放一个音频资源，返回可取消的 Operation；默认时限 30 秒。 |
| `wake` | Channel | 唤醒事件流，帧为 `WakeEvent`。 |
| `capture` | Channel | 采集音频块流，帧为 `CaptureChunk`。 |
| `playback` | Channel | 播放事件流，帧为 `PlaybackEvent`。 |
| `audio_wake_word_detected` | Event | 检测到唤醒词时推送，`payload` 为 `WakeEvent`（`keyword` / `timestamp_us`）。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

本页方法用到的枚举：

**`CaptureEnd` 枚举**

| 取值 | 说明 |
|------|------|
| `SILENCE` | 静音超时结束 |
| `MAX_DURATION` | 达到最长时长 |
| `NO_SPEECH` | 未检测到人声 |
| `STOPPED` | 被调用方停止 |
| `FAILED` | 失败 |

**`PlaybackState` 枚举**

| 取值 | 说明 |
|------|------|
| `STARTED` | 开始播放 |
| `FINISHED` | 播放完成 |
| `INTERRUPTED` | 被打断 |
| `FAILED` | 失败 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### stop

停止当前播放或采集。

```python
stop(*, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `VoiceStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `VoiceStatus` | 状态快照 |

### set_volume

设置音量，取值 0–1。

```python
set_volume(volume: float, *, timeout_ms: int = 3000) -> VoiceStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `volume` | `float` | （必填） | 音量，0–1 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `VoiceStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `VoiceStatus` | 状态快照 |

### set_mute

静音或取消静音。

```python
set_mute(muted: bool, *, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `muted` | `bool` | （必填） | 是否静音 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `VoiceStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `VoiceStatus` | 状态快照 |

### set_wakeword_enabled

启用或停用唤醒词。

```python
set_wakeword_enabled(enabled: bool, *, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | 是否使能 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `VoiceStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `VoiceStatus` | 状态快照 |

### get_status

读取语音状态快照。`get_state` 是别名。

```python
get_status(*, timeout_ms: int = 1000) -> VoiceStatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `VoiceStatusApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `VoiceStatus` | 状态快照 |

### stop_capture

停止指定采集会话。

```python
stop_capture(*, session_id: str, timeout_ms: int = 3000) -> CaptureAccepted
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | `str` | （必填） | 会话 id |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `CaptureAccepted`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `session_id` | `str` | 会话 id；同一会话的采集与播放操作必须一致 |
| `accepted` | `bool` | 是否被接受 |

### begin_playback

开始流式播放会话，随后用 `write_audio` 推流。

```python
begin_playback(*, session_id: str, sample_rate: int = 16000, channels: int = 1, timeout_ms: int = 3000) -> PlaybackAccepted
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | `str` | （必填） | 会话 id |
| `sample_rate` | `int` | `16000` | 采样率，赫兹 |
| `channels` | `int` | `1` | 声道数 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `PlaybackAccepted`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `session_id` | `str` | 会话 id；同一会话的采集与播放操作必须一致 |
| `accepted` | `bool` | 是否被接受 |
| `buffered_bytes` | `int` | 已缓冲字节数 |

### write_audio

写入一块音频；`final=True` 表示最后一块。

```python
write_audio(*, session_id: str, sequence: int, final: bool, data: list[int], timeout_ms: int = 3000) -> PlaybackAccepted
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | `str` | （必填） | 会话 id |
| `sequence` | `int` | （必填） | 序号 |
| `final` | `bool` | （必填） | 是否为最后一块 |
| `data` | `list[int]` | （必填） | 音频字节 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `PlaybackAccepted`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `session_id` | `str` | 会话 id；同一会话的采集与播放操作必须一致 |
| `accepted` | `bool` | 是否被接受 |
| `buffered_bytes` | `int` | 已缓冲字节数 |

### listen

采集一段语音，返回可取消的 Operation，终态结果为 `CaptureSummary`。

```python
listen(*, session_id: str, wake_cue: bool = True, max_seconds: float = 0.0) -> ListenOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | `str` | （必填） | 会话 id |
| `wake_cue` | `bool` | `True` | 是否播放唤醒提示音 |
| `max_seconds` | `float` | `0.0` | 最长采集时长（秒） |

返回 `ListenOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

```python
from fabot.core import OperationState
from fabot.capabilities.voice import CaptureEnd

ch = robot.voice.capture(qos_profile="realtime")
op = robot.voice.listen(session_id="demo-1", wake_cue=True, max_seconds=5.0)

captured = bytearray()
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=8000):
    captured.extend(frame.payload.data)

snap = op.get(timeout=10.0)
if snap.state is OperationState.Succeeded:
    print(snap.result.voiced, snap.result.bytes, snap.result.reason)   # reason 为 CaptureEnd
ch.close()
```

### play_audio

播放一个音频资源，返回可取消的 Operation。

```python
play_audio(uri: str) -> PlayAudioOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `uri` | `str` | （必填） | 资源地址 |

返回 `PlayAudioOperation` 句柄：`id` / `get()` / `wait()` / `cancel()` / `events()`，也可作迭代器与上下文管理器。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### wake()

唤醒事件流。

```python
wake(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `WakeEvent`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `keyword` | `str` | 命中的唤醒词 |
| `timestamp_us` | `int` | 采样时间戳（微秒） |

### capture()

采集音频块流。

```python
capture(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `CaptureChunk`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | `str` | 会话 id；同一会话的采集与播放操作必须一致 |
| `sequence` | `int` | 序号，从 0 递增 |
| `sample_rate` | `int` | 采样率，赫兹 |
| `channels` | `int` | 声道数 |
| `timestamp_us` | `int` | 采样时间戳（微秒） |
| `data` | `list[int]` | 音频字节 |

### playback()

播放事件流。

```python
playback(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `PlaybackEvent`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | `str` | 会话 id；同一会话的采集与播放操作必须一致 |
| `state` | `PlaybackState` | 状态取值 |
| `timestamp_us` | `int` | 采样时间戳（微秒） |

## 事件

经 `robot.<slot>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.<slot>.events.audio_wake_word_detected` | `AudioWakeWordDetectedEvent` | `audio_wake_word_detected` |
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`：`Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot` |

### audio_wake_word_detected

检测到唤醒词时推送，`payload` 为 `WakeEvent`（`keyword` / `timestamp_us`）。

## 异常

查询入口 `robot.<slot>.faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的故障文本用 `Catalogs.format_fault(record, capability_id="...")`，见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 状态

`status()` 返回该能力的只读状态袋；整机聚合见 `robot.status()`。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `activity` | `str` | `idle` | `idle` / `listening` / `speaking` |

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

采集占用 `speaker` + `microphone`，播放只占 `speaker`，策略均为 `reject`：同一时刻只允许一个会话，冲突时立即拒绝。
