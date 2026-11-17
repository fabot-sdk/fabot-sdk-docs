---
title: 技能概览
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 技能概览

## 模块概述

- 入口：`robot.skills`
- 技能是机器人侧的独立单元，把多个能力槽位组合成更高层语义。当前 SDK 生成两个技能：多相机同步 `camera_sync`、语音语义 `voice_aiui`。
- 技能 Proxy 与能力 Proxy 同构（`slot_id` / `handle` / `events` / `status()` / `health()` / `lifecycle()` / `faults()` / `self_check()` / `ping()` 与配置读写），但**不出现在 `robot.slots` 里**，也不经槽位解析。

| 技能 | 入口 | `SKILL_ID` | 配置类型 | 配置域 | 章节 |
|------|------|-----------|----------|--------|------|
| 多相机同步 | `robot.skills.camera_sync` | `fabot_camera_sync` | `CameraSyncConfig` | `alignment` / `frame_region` | [camera_sync.md](camera_sync.md) |
| 语音语义 | `robot.skills.voice_aiui` | `fabot_voice_aiui` | `VoiceAiuiConfig` | `aiui` | [voice_aiui.md](voice_aiui.md) |

技能是否部署、是否启用由机器人配置决定：先读 `is_available` 再调用其余成员。判定依据是配置里该技能槽位已启用且绑定了 adapter；查不到配置时退回检查句柄是否有效。未部署时访问句柄或命令会失败。

## API 总览

技能 Proxy 的公共成员（各技能章节只列该技能特有的部分）：

| 成员 | 类型 | 说明 |
|------|------|------|
| `SKILL_ID` | 属性 | 技能 id 类属性 |
| `robot` | 属性 | 所属 `Robot` |
| `is_available` | 属性 | 技能是否已部署并启用（只读） |
| `slot_id` | 属性 | 技能在配置里使用的槽位 id，默认与 `SKILL_ID` 相同 |
| `handle` | 属性 | 技能句柄 `SlotHandle`（惰性解析） |
| `events` | 属性 | 事件入口（`fault_changed` / `lifecycle_changed`，另有通配 `subscribe()`） |
| `status` | Command | 技能状态袋；状态未上报时抛 `RuntimeError` |
| `health` | Command | 健康状态 `SlotHealth` |
| `lifecycle` | Command | 生命周期快照 `CapabilityLifecycleSnapshot` |
| `faults` | Command | 当前故障袋 `Faults` |
| `self_check` | Command | 主动执行技能自检，返回 `SelfCheckReport`；会写入故障锁存 |
| `ping` | Command | 往返时延探测 `PingReport` |
| `has_adapter` | 属性 | 是否已绑定 adapter |
| `as_adapter` | Command | 转为具体 adapter 的强类型视图 |
| `get_config` / `set_config` / `edit_config` | Command / 上下文管理器 | 技能配置域读写 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。

### status / health / lifecycle / faults

```python
robot.skills.<name>.status() -> Status
robot.skills.<name>.health() -> SlotHealth
robot.skills.<name>.lifecycle() -> CapabilityLifecycleSnapshot
robot.skills.<name>.faults() -> Faults
```

四个都是只读查询，无参数。`status()` 直接读状态袋，未上报时抛 `RuntimeError`；整机聚合 `robot.status()` 里**没有**技能字段。各技能的状态字段见对应章节。

### self_check

```python
robot.skills.<name>.self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> SelfCheckReport
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `0` | 调用超时（毫秒）；`0` 用客户端缺省超时 |
| `timeout` | `float \| None` | `None` | 同义的秒制写法 |

会写入故障锁存，见 [自检](../../../usage/self-check.md)。

### ping

```python
robot.skills.<name>.ping(payload: bytes = b"", count: int = 1, timeout_ms: int = 1000, *, timeout: float | None = None) -> PingReport
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `payload` | `bytes` | `b""` | 载荷字节 |
| `count` | `int` | `1` | 采样次数 |
| `timeout_ms` | `int` | `1000` | 单次探测超时（毫秒） |

### get_config / set_config / edit_config

```python
robot.skills.<name>.get_config() -> CameraSyncConfig | VoiceAiuiConfig
robot.skills.<name>.set_config(config, *, only_domains=None) -> CameraSyncConfig | VoiceAiuiConfig
robot.skills.<name>.edit_config()  # 上下文管理器
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `config` | 配置 dataclass | （必填） | 目标配置 |
| `only_domains` | `set[str] \| None` | `None` | 只提交这些配置域；`None` 表示全部 |

`set_config()` 以 CAS 提交，冲突抛 `ConfigurationConflict`，成功后返回重新读取的配置；`edit_config()` 在退出时只提交变化的域。规则与能力配置一致，见 [配置管理](../../../usage/configuration.md)。

## 通道

`robot.skills` 本身没有通道。各技能的通道见 [camera_sync.md](camera_sync.md) 与 [voice_aiui.md](voice_aiui.md) 的「通道」一节。

## 事件

经 `robot.skills.<name>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

两个技能都只发布平台事件：

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.skills.<name>.events.fault_changed` | `FaultChangedEvent` | `faults`：`Faults` |
| `robot.skills.<name>.events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`：`CapabilityLifecycleSnapshot` |
| `robot.skills.<name>.events.subscribe(cb, on_error=...)` | 通配订阅 | `Event` |

```python
def on_fault(event):
    print(event.header.timestamp_us, event.faults.revision, len(event.faults.records))

token = robot.skills.camera_sync.events.fault_changed.subscribe(on_fault)
# ...
token.close()
```

## 异常

`faults()` 返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的文本用 `Catalogs.format_fault(record)`，见 [文本目录 Catalogs](../catalogs.md)。诊断码按 domain / module 编码，见 [诊断码参考](../error-codes.md)。

失败形态与能力一致：`is_available` 为假时解析句柄或下发命令会失败；命令超时抛 `Timeout`，资源冲突抛 `ResourceConflict`，配置冲突抛 `ConfigurationConflict`，见 [错误处理](../../../usage/errors.md)。

## 状态

技能的状态袋字段由各技能定义，见对应章节。公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../../usage/status-faults.md)。

## 资源

技能是否占用资源由各自的 Operation 决定：

| 技能 | 资源 | 策略 | 占用者 |
|------|------|------|--------|
| `camera_sync` | — | — | 无 Operation，不占资源 |
| `voice_aiui` | `speaker` | `reject` | `speak` |

## 相关

- 技能概念与可用性判断：[技能与扩展](../../../usage/skills.md)
- 配置域读写与冲突重试：[配置管理](../../../usage/configuration.md)
- 相机硬件与流：[相机 Camera](../camera.md)
- 语音硬件与流：[语音 Voice](../voice.md)
