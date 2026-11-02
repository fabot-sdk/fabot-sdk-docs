---
title: 语音
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 语音

音频采集、播放与硬件控制。语义能力（转写、意图识别、合成播报）在技能 `robot.skills.voice_aiui`，见 [技能与扩展](../../usage/skills.md)。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [语音](../../reference/python/voice.md)。

## 播放一个音频文件

`play_audio` 返回长时 Operation，`uri` 是音频资源地址：

```python
from fabot import Robot
from fabot.core import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["voice"])

    op = robot.voice.play_audio("https://example.com/prompt.wav")
    snap = op.get(timeout=30.0)
    print(snap.state is OperationState.Succeeded, snap.result)
```

播放占用 `speaker` 资源，策略 `reject`：同一时刻只允许一个播放会话。

## 采集一段语音

`listen` 返回可取消的 Operation，音频块从 `capture()` 通道读取。终态结果是 `CaptureSummary`（`voiced` / `bytes` / `duration_ms` / `reason`），`reason` 是 `CaptureEnd` 枚举。

```python
from fabot.capabilities.voice import CaptureEnd

ch = robot.voice.capture(qos_profile="realtime")
op = robot.voice.listen(session_id="demo-1", wake_cue=True, max_seconds=5.0)

audio = bytearray()
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=8000):
        audio.extend(frame.payload.data)
finally:
    ch.close()

snap = op.get(timeout=10.0)
if snap.result is not None:
    print(snap.result.voiced, snap.result.bytes, snap.result.reason)
```

采集同时占用 `speaker` 与 `microphone`，策略 `reject`，所以采集期间不能同时播放。

## 流式播放（自己产生音频）

需要在应用侧合成音频时，用 `begin_playback` 开会话，再用 `write_audio` 逐块推送，`playback()` 通道给出播放事件：

```python
ch = robot.voice.playback(qos_profile="realtime")
robot.voice.begin_playback(session_id="tts-1", sample_rate=16000, channels=1)
robot.voice.write_audio(session_id="tts-1", sequence=0, final=True, data=list(pcm_bytes))
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.payload.state)     # PlaybackState
    break
ch.close()
```

## 音量、静音与唤醒词

```python
robot.voice.set_volume(0.7)
robot.voice.set_mute(False)
robot.voice.set_wakeword_enabled(True)

status = robot.voice.get_status().status
print(status.activity, status.volume, status.muted, status.wakeword_enabled)
```

## 订阅唤醒与播放事件

```python
def on_wake(event):
    print("唤醒词:", event.audio_wake_word_detected.keyword)

token = robot.voice.events.audio_wake_word_detected.subscribe(on_wake)
```

`wake()` 通道也推送 `WakeEvent`；`capture()` 推送 `CaptureChunk`，`playback()` 推送 `PlaybackEvent`。

## 用技能做语义播报

语音硬件之上还有语义技能，`speak` 走云端合成后播放：

```python
aiui = robot.skills.voice_aiui
if aiui.is_available:
    aiui.speak("好的，正在前往充电桩。").wait(timeout=15.0)
```
