---
title: 技能与扩展
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 技能与扩展

除了 15 个能力模块，SDK 还提供**技能（Skill）**：跨多个能力槽位、在 SDK 侧组合出更高层语义的封装。技能通过 `robot.skills` 访问，形态与能力 Proxy 一致（有 `slot_id` / `handle` / `events` / `health()` / `lifecycle()` / `faults()` / `ping()` 与配置读写），但操作的是机器人上的技能单元，而不是单个能力槽位。

| 技能 | 入口 | 说明 |
|------|------|------|
| 多相机同步 | `robot.skills.camera_sync` | 把多个相机槽位的帧按时间配对成 `SyncedFrameSet` |
| 语音语义 | `robot.skills.voice_aiui` | 转写、意图识别与语义播报，建立在 `voice` 硬件能力之上 |

## 可用性判断

技能是否部署、是否启用由机器人配置决定。先查 `is_available`（只读属性）再调用，未部署时访问其余方法会失败：

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    if robot.skills.camera_sync.is_available:
        groups = robot.skills.camera_sync.get_sync_groups()
        print([group.id for group in groups.groups])
```

`is_available` 的判断依据是：配置里该技能槽位已启用且绑定了 adapter；查不到配置时退回检查句柄是否有效。

## 多相机同步（camera_sync）

把多个相机槽位的同类流按时间戳配成一组，产出「同一时刻的多相机帧集合」。

```python
robot.skills.camera_sync.get_sync_groups(*, timeout_ms: int = 1000) -> SyncGroupList
robot.skills.camera_sync.capture_synced(*, group_id: str = "", wait_for_fresh: bool = True, timeout_ms: int = 5000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> SyncedFrameSet
robot.skills.camera_sync.sync_groups(qos_profile: str = "latest") -> SyncGroupsChannel
robot.skills.camera_sync.synced_frames(qos_profile: str = "latest") -> SyncedFramesChannel
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `group_id` | `str` | `""` | 同步组 id；空串表示用配置里的缺省组 |
| `wait_for_fresh` | `bool` | `True` | 是否等待一组新帧 |
| `timeout_ms` | `int` | `5000` | 抓取超时（毫秒） |
| `transport_hint` | `FrameTransportHint` | `AUTO` | 帧传输方式偏好 |
| `client_boot_id` | `str` | `""` | 客户端启动标识，空串自动填充 |

**`SyncGroupList` 字段**：`groups`（`list[SyncGroup]`）/ `clock_domain` / `clock_epoch_id` / `ptp_locked` / `active_group_count` / `region_overrun_total`。

**`SyncGroup` 字段**：`id` / `inputs`（`slot` / `stream` / `fps` / `encoding` / `max_width` / `max_height`）/ `tolerance_ms` / `max_wait_ms` / `queue_depth` / `missing_policy`（`MissingPolicy`）/ `emitted_sets` / `dropped_sets`。

**`SyncedFrameSet` 字段**：`group_id` / `sequence` / `target_stamp_ns` / `clock_domain` / `clock_epoch_id` / `ptp_locked` / `tolerance_ns` / `max_uncertainty_ns` / `expires_at_ns`，以及成员列表。

**`SyncedMember` 字段**：`slot` / `stream` / `match_status`（`MemberMatchStatus`）/ `delta_ns` / `timestamp_uncertainty_ns` / `frame`（`ImageFrame`）。

| `MissingPolicy` | 含义 |
|-----------------|------|
| `DROP_SET` | 成员缺失时丢弃整组 |
| `EMIT_PARTIAL` | 缺失成员留空，仍然发出 |
| `REUSE_LATEST` | 用最近的旧帧补齐 |

| `MemberMatchStatus` | 含义 |
|---------------------|------|
| `MATCHED` | 时间窗内匹配到新帧 |
| `REUSED` | 复用了旧帧 |
| `MISSING` | 缺失 |

```python
from fabot.capabilities.camera import FrameTransportHint

sync = robot.skills.camera_sync
frame_set = sync.capture_synced(group_id="wrist_pair", transport_hint=FrameTransportHint.AUTO)
print(frame_set.sequence, frame_set.ptp_locked, frame_set.max_uncertainty_ns)
for member in frame_set.members:
    print(member.slot, member.stream, member.match_status, member.delta_ns)
```

`synced_frames()` 是持续推送的通道（`SyncedFramesChannel`），`sync_groups()` 推送同步组清单变化（`SyncGroupsChannel`，只有 `info()` 与租约操作，不产出帧）。

技能的配置域（同步组、容差、缺失策略、帧区域保留）经 `get_config()` / `set_config()` / `edit_config()` 读写，规则与能力配置相同，见 [配置管理](configuration.md)。

## 语音语义（voice_aiui）

在 `voice` 硬件能力之上提供转写、意图识别与语义播报。硬件侧的采集与播放仍在 [语音 Voice](../reference/python/voice.md)，本技能负责语义处理。

```python
robot.skills.voice_aiui.speak(text: str, *, speaker_id: str = "") -> SpeakOperation
robot.skills.voice_aiui.stop(*, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.list_speakers(*, timeout_ms: int = 3000) -> SpeakerList
robot.skills.voice_aiui.set_speaker(speaker_id: str, *, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.set_speaking_rate(speaking_rate: float, *, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.set_auto_answer(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.set_play_intent_audio(enabled: bool, *, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.get_settings(*, timeout_ms: int = 1000) -> SettingsApplied
robot.skills.voice_aiui.get_status(*, timeout_ms: int = 1000) -> StatusApplied
robot.skills.voice_aiui.transcript(qos_profile: str = "latest") -> TranscriptChannel
robot.skills.voice_aiui.intent(qos_profile: str = "latest") -> IntentChannel
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `text` | `str` | （必填） | 要播报的文本 |
| `speaker_id` | `str` | `""` | 发音人 id；空串用当前设置的发音人 |
| `speaking_rate` | `float` | （必填） | 语速倍率 |
| `enabled` | `bool` | （必填） | 自动应答 / 意图音频开关 |

| 成员 | 说明 |
|------|------|
| `speak(...)` | 语义播报，返回可轮询、可取消的 `SpeakOperation` |
| `transcript()` | 转写结果通道，payload 为 `TranscriptEvent` |
| `intent()` | 意图识别通道，payload 为 `IntentEvent` |
| `stop()` | 打断当前播报 |
| `list_speakers()` / `set_speaker()` | 发音人清单与选择 |
| `set_speaking_rate()` | 语速 |
| `set_auto_answer()` / `set_play_intent_audio()` / `get_settings()` | 自动应答、意图音频开关与设置读取 |
| `get_status()` | 技能状态快照（`Speaker` / `SpeakerInfo` 等） |

```python
aiui = robot.skills.voice_aiui
if aiui.is_available:
    for event in aiui.intent().frames(poll_timeout_ms=200, timeout_ms=10000):
        print(event.payload.intent_id, event.payload.transcript)
        break
    aiui.speak("好的，正在前往充电桩。").wait(timeout=10.0)
```

:::note 与硬件能力的边界
`robot.voice` 管麦克风与扬声器本身（音量、静音、唤醒词、原始音频流）；`robot.skills.voice_aiui` 管语义（转写、意图、合成播报）。两者可以同时使用：例如用 `voice.capture()` 自己处理音频，或用技能的高层接口。
:::

## 自定义技能的接入

技能在机器人侧是一个独立单元，配置与能力 adapter 一样通过配置域读写。应用侧要识别一个技能，需要机器人端的部署与配置；SDK 只暴露已生成的技能入口（当前为 `camera_sync` 与 `voice_aiui`）。接入新技能见 [配置管理](configuration.md) 的配置域说明。

## 相关

- 能力配置域的读写：[配置管理](configuration.md)
- 平台服务（进程级）的管理：[平台服务管理](services.md)
- 相机硬件能力与流：[相机 Camera](../reference/python/camera.md)
- 语音硬件能力与流：[语音 Voice](../reference/python/voice.md)
