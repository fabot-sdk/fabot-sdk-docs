---
title: 语音
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 语音

语音合成播报与语音转写订阅。长时任务模型见 [命令与长时操作](../../usage/commands-operations.md)，通道用法见 [事件与数据通道](../../usage/events-channels.md)，接口见 [语音](../../reference/python/voice.md)。

## 合成并播报一句话

`list_speakers()` 列出可选发音人；`speak` 返回长时 Operation，用 `events()` 轮询状态直到终态再读结果。`text` 与 `speaker_id` 均为必填关键字参数，`speaker_id` 传空串表示沿用当前发音人。

```python
from fabot import Robot
from fabot.core.types import OperationState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["voice"])

    speakers = robot.voice.list_speakers().speakers
    for spk in speakers:
        print(spk.speakerId, spk.locale, spk.gender)

    speaker_id = speakers[0].speakerId if speakers else ""
    op = robot.voice.speak(text="你好，我是机器人", speaker_id=speaker_id)
    for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
        print("状态:", snap.state)
        if snap.terminal:
            break

    if snap.state == OperationState.Succeeded:
        print("播报完成:", snap.result.statusMessage)
    else:
        print("播报失败:", snap.error)
```

注意：

- `speak` 与 `play_audio` 共享同一发音资源：播报进行中再发起新任务会被**拒绝**（而非排队）；可用 `op.cancel()` 取消，或用 `robot.voice.stop()` 打断当前输出。
- 播报前可用 Command 调整输出，如 `robot.voice.set_volume(volume=0.6)`、`robot.voice.set_speaking_rate(speaking_rate=1.2)`，返回的 `status` 是应用后的状态快照，字段见 [语音](../../reference/python/voice.md)。

## 订阅语音转写

`transcript()` 打开转写通道，`frames()` 迭代帧，用完务必 `close()`：

```python
ch = robot.voice.transcript(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=10000):
        p = frame.payload
        if p.isFinal:
            print("最终:", p.text, "置信度:", p.confidence)
        else:
            print("中间:", p.text)
finally:
    ch.close()
```

`payload` 为 `TranscriptEventT`（`text` / `isFinal` / `confidence` / `timestampUs`）；`isFinal` 为 `False` 的是中间结果。唤醒词与意图识别分别用 `wake()` / `intent()` 通道，打开方式相同，见 [语音](../../reference/python/voice.md)。

## 相关链接

- [命令与长时操作](../../usage/commands-operations.md)
- [事件与数据通道](../../usage/events-channels.md)
- [语音 API 参考](../../reference/python/voice.md)
