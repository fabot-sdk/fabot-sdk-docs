---
title: 语音语义 VoiceAiui
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 语音语义 VoiceAiui

## 模块概述

- 技能：`voice_aiui`；入口：`robot.skills.voice_aiui`
- 技能 id：`fabot_voice_aiui`；配置类型 `VoiceAiuiConfig`
- 在 `voice` 硬件能力之上提供转写、意图识别与语义播报。麦克风与扬声器本身的采集、播放仍在 [语音 Voice](../voice.md)，本技能负责语义。
- `speak` 是 Operation，占用资源 `speaker`，策略 `reject`，默认时限 30 秒，可取消。

公共成员（`is_available` / `handle` / `events` / `health()` / `faults()` / `ping()` / `self_check()` / 配置读写）见 [技能概览](./index.md)。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `stop` | Command | 打断当前播报（`StatusApplied`）；默认超时 1000 ms。 |
| `set_speaker` | Command | 选择发音人（`StatusApplied`）；默认超时 1000 ms。 |
| `list_speakers` | Command | 列出发音人清单（`SpeakerList`）；默认超时 3000 ms。 |
| `set_speaking_rate` | Command | 设置语速倍率（`StatusApplied`）；默认超时 1000 ms。 |
| `set_auto_answer` | Command | 自动应答开关（`SettingsApplied`）；默认超时 1000 ms。 |
| `set_play_intent_audio` | Command | 意图音频开关（`SettingsApplied`）；默认超时 1000 ms。 |
| `get_settings` | Command | 读取设置（`SettingsApplied`）；默认超时 1000 ms。 |
| `get_status` | Command | 读取状态快照（`StatusApplied`）；`get_state` 是同义别名。 |
| `speak` | Operation | 语义播报，返回可轮询、可取消的 `SpeakOperation`。 |
| `transcript` | Channel | 转写结果流，帧为 `TranscriptEvent`。 |
| `intent` | Channel | 意图识别流，帧为 `IntentEvent`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../../usage/basics/commands-operations.md)。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `speaker_id`），生成类型同时接受原样的驼峰别名。

### speak

语义播报：文本送云端合成后经扬声器播放。返回的 `SpeakOperation` 与能力 Operation 同构。

```python
speak(text: str, *, speaker_id: str = "") -> SpeakOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `text` | `str` | （必填） | 要播报的文本 |
| `speaker_id` | `str` | `""` | 发音人 id；空串用当前设置的发音人 |

`SpeakOperation` 的成员：

| 成员 | 说明 |
|------|------|
| `id` | Operation id |
| `get(timeout=..., timeout_ms=...)` | 取一次快照 `SpeakOperationSnapshot` |
| `wait(timeout=..., timeout_ms=...)` | 等到终态，返回 `Outcome`（失败 / 取消 / 超时抛对应异常） |
| `cancel()` | 请求取消，返回取消后的快照 |
| `events(...)` / 迭代 | 持续产出快照，`terminal` 为 `True` 时结束 |

`SpeakOperationSnapshot` 字段：`operation_id` / `state`（`OperationState`）/ `terminal` / `updated_at_us` / `sequence` / `feedback`（`Empty`）/ `result`（`Outcome`）/ `error`（`FabotError | None`）。

```python
op = robot.skills.voice_aiui.speak("好的，正在前往充电桩。")
outcome = op.wait(timeout=30.0)
print(outcome.success, outcome.status_message)
```

### stop / set_speaker / set_speaking_rate

```python
stop(*, timeout_ms: int = 1000) -> StatusApplied
set_speaker(speaker_id: str, *, timeout_ms: int = 1000) -> StatusApplied
set_speaking_rate(speaking_rate: float, *, timeout_ms: int = 1000) -> StatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `speaker_id` | `str` | （必填） | 发音人 id，取值来自 `list_speakers()` |
| `speaking_rate` | `float` | （必填） | 语速倍率，`1.0` 为正常语速 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

三个方法都返回 `StatusApplied`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `status` | `Status` | 链路上原始的状态快照（见 `get_status`） |

`stop()` 只打断正在进行的播报，不影响麦克风采集。

### list_speakers

```python
list_speakers(*, timeout_ms: int = 3000) -> SpeakerList
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `SpeakerList`

| 字段 | 类型 | 说明 |
|------|------|------|
| `speakers` | `list[SpeakerInfo]` | 可用发音人 |
| `outcome` | `Outcome` | 调用结果 |

`SpeakerInfo` 字段：`speaker_id` / `locale` / `gender`。`speaker_id` 即 `set_speaker()` 与 `speak()` 接受的取值，来自配置里的 `aiui.speakers[].name` 或官方 vcn。

### 设置

```python
set_auto_answer(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
set_play_intent_audio(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
get_settings(*, timeout_ms: int = 1000) -> SettingsApplied
get_status(*, timeout_ms: int = 1000) -> StatusApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | 自动应答 / 意图音频开关 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

`SettingsApplied` 字段：`outcome` / `settings`（`Settings`）。`Settings` 字段：`auto_answer` / `play_intent_audio`。

`get_status()` 返回 `StatusApplied`（`outcome` + `status`），其中 `status` 是链路上的原始快照：`activity` 为整数（枚举序号），另有 `speaker_id` / `speaking_rate` / `auto_answer` / `play_intent_audio` / `cloud_connected` / `last_error`。需要解析后的枚举写法用 `status()`，见「状态」。

`get_state` 是 `get_status` 的别名，两者等价。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../../usage/data/events-channels.md)。

### transcript

转写结果流。

```python
transcript(qos_profile: str = "latest") -> TranscriptChannel
```

帧 payload 为 `TranscriptEvent`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `text` | `str` | 转写文本 |
| `is_final` | `bool` | 是否为该句的最终结果；中间结果会反复推送 |
| `confidence` | `float` | 置信度 |
| `timestamp_us` | `int` | 时间戳（微秒） |

外层的 `TranscriptChannelFrame` 带 `channel_id` / `sequence` / `timestamp_us` / `payload`。`next()` 不传参时默认等 5 秒。

### intent

意图识别流。

```python
intent(qos_profile: str = "latest") -> IntentChannel
```

帧 payload 为 `IntentEvent`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `intent_id` | `str` | 命中的意图 id |
| `transcript` | `str` | 触发该意图的文本 |
| `confidence` | `float` | 置信度 |
| `timestamp_us` | `int` | 时间戳（微秒） |

外层的 `IntentChannelFrame` 与 `TranscriptChannelFrame` 同构。

```python
aiui = robot.skills.voice_aiui
for event in aiui.transcript().frames(poll_timeout_ms=200, timeout_ms=10000):
    if event.payload.is_final:
        print(event.payload.text, event.payload.confidence)
        break
```

## 事件

经 `robot.skills.voice_aiui.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`。

| 入口 | 事件类型 | payload |
|------|------|------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`：`Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`：`CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | 通配订阅 | `Event` |

转写与意图不走事件，走 `transcript()` / `intent()` 通道。

## 异常

`robot.skills.voice_aiui.faults()` 返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的文本用 `Catalogs.format_fault(record)`，见 [文本目录 Catalogs](../catalogs.md)。

调用失败：`speak` 被占用时抛 `ResourceConflict`；终态为失败 / 取消 / 超时时，`wait()` 抛 `FabotError` / `Canceled` / `Timeout`。云端凭证缺失时技能仍在运行，但播报与识别不可用——查 `status().cloud_connected` 与 `status()` 的 `activity`。见 [错误处理](../../../usage/diagnostics/errors.md)。

## 状态

`status()` 返回只读状态袋；整机聚合里没有技能字段。状态未上报时抛 `RuntimeError`。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `activity` | `Activity` | `Idle` | `Idle` / `Listening` / `Speaking`（取值 `idle` / `listening` / `speaking`） |
| `speaker_id` | `str` | `""` | 当前发音人 |
| `speaking_rate` | `float` | `1.0` | 语速倍率 |
| `auto_answer` | `bool` | `False` | 自动应答开关 |
| `play_intent_audio` | `bool` | `False` | 意图音频开关 |
| `cloud_connected` | `bool` | `False` | 云端是否连通 |

公共只读查询：`health()` 返回 `SlotHealth`，`lifecycle()` 返回 `CapabilityLifecycleSnapshot`。

## 资源

| 资源 | 策略 | 占用者 |
|------|------|--------|
| `speaker` | `reject` | `speak` |

同一时刻只允许一个播报，冲突时立即拒绝并抛 `ResourceConflict`。`speak` 默认时限 **30 秒**，可取消。其余方法都是短 Command，不占用资源。

## 配置域

`VoiceAiuiConfig`（`SKILL_ID` 与 `ADAPTER_ID` 均为 `fabot_voice_aiui`），单个配置域 `aiui`。

```python
with robot.skills.voice_aiui.edit_config() as conf:
    conf.aiui.auto_answer = False
# 退出时只提交 aiui 域
```

| 字段 | 默认 | 说明 |
|------|------|------|
| `api_keys` | 空凭据 | `aiui_appid` / `aiui_api_key` / `aiui_api_sk`；缺任一项时云端功能不可用，技能保持运行并在后台重试 |
| `auto_answer` | `True` | 云端回答是否直接播报；关闭后只发布 transcript 与 intent |
| `play_intent_audio` | `False` | 命中 `intents` 时是否播放随包音频 |
| `wakeup_interrupt` | `True` | 播报或等云端结果时再次唤醒是否打断当前一轮 |
| `scene` | `main` | AIUI 场景标识，与讯飞控制台一致 |
| `auth_id` | `test-sn` | 鉴权用户名 |
| `tts.voice` | `x4_lingfeizhe_oral` | 默认发音人，可写 `speakers[].name` 或官方 vcn |
| `tts.speed` | `50` | 语速，0–100，越大越快 |
| `speakers[]` | 8 档中文 / 英文音色 | 每项 `name` / `vcn` / `locale` / `gender`；`list_speakers` / `set_speaker` / `speak` 只认这里的 `name` 与官方 vcn |
| `timeouts.result_ms` | `30000` | 等待识别与意图结果的超时 |
| `timeouts.tts_start_ms` | `2000` | 等待 TTS 开始出声的超时 |
| `timeouts.tts_playback_ms` | `60000` | 单次播放的整体上限 |
| `hardware.slot` | `voice` | `voice` 能力所在的逻辑槽位名 |
| `resources.directory` | `""` | 资源根目录；留空用安装树里的随包资源 |
| `resources.work_directory` | `""` | 运行期临时文件目录 |
| `resources.aiui_library` | `""` | AIUI 动态库目录；留空用随包那份 |
| `intents[]` | `cola` / `aipaoge/tts_D2_cola.wav` | 每项 `name` / `audio`；只在 `play_intent_audio` 开启时播放 |
| `logging.level` | `info` | `debug` / `info` / `warn` / `error` |

凭据只填在用户运行配置里，不要写进随包模板。枚举取值的合法项用 `VoiceAiuiConfig.field_options()` 读。

## 相关

- 技能概念与可用性判断：[技能与扩展](../../../usage/configuration/skills.md)
- 语音硬件与流：[语音 Voice](../voice.md)
- 配置域读写：[配置管理](../../../usage/configuration/configuration.md)
- 命令与长时操作：[命令与长时操作](../../../usage/basics/commands-operations.md)
