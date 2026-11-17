---
title: 多相机同步 CameraSync
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 多相机同步 CameraSync

## 模块概述

- 技能：`camera_sync`；入口：`robot.skills.camera_sync`
- 技能 id：`fabot_camera_sync`；配置类型 `CameraSyncConfig`
- 把多个相机槽位的同类流按时间戳配成一组，产出「同一时刻的多相机帧集合」`SyncedFrameSet`。
- 先用 `get_sync_groups()` 确认分组，再用 `capture_synced()` 单次抓取，或订阅 `synced_frames()` 持续取帧集。
- 本技能没有 Operation，`capture_synced` 是短 Command，不占用资源。

公共成员（`is_available` / `handle` / `events` / `health()` / `faults()` / `ping()` / `self_check()` / 配置读写）见 [技能概览](index.md)。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_sync_groups` | Command | 读取同步组清单（`SyncGroupList`）；默认超时 1000 ms。 |
| `capture_synced` | Command | 同步抓取一组多相机帧（`SyncedFrameSet`）；默认超时 5000 ms。 |
| `sync_groups` | Channel | 同步组清单变化通道，只有 `info` 属性，不产出帧。 |
| `synced_frames` | Channel | 同步帧集流，帧为 `SyncedFrameSet`。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `group_id`），生成类型同时接受原样的驼峰别名。

### get_sync_groups

读取当前生效的同步组清单。

```python
get_sync_groups(*, timeout_ms: int = 1000) -> SyncGroupList
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `SyncGroupList`

| 字段 | 类型 | 说明 |
|------|------|------|
| `groups` | `list[SyncGroup]` | 同步组列表 |
| `clock_domain` | `str` | 同步所用的时钟域 |
| `clock_epoch_id` | `str` | 时钟纪元标识；变化表示时钟源重同步 |
| `ptp_locked` | `bool` | PTP 是否锁定 |
| `active_group_count` | `int` | 当前活跃的同步组数 |
| `region_overrun_total` | `int` | 帧区域保留超限累计次数 |

**`SyncGroup` 字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `str` | 同步组 id |
| `inputs` | `list[SyncGroupInput]` | 组内输入（`slot` / `stream` / `fps`） |
| `tolerance_ms` | `int` | 组内时间允许的最大偏差 |
| `max_wait_ms` | `int` | 凑齐一组的最长等待 |
| `queue_depth` | `int` | 组内每路输入的缓冲深度 |
| `missing_policy` | `MissingPolicy` | 成员缺失时的策略 |
| `emitted_sets` | `int` | 已发出的帧集数 |
| `dropped_sets` | `int` | 已丢弃的帧集数 |

```python
groups = robot.skills.camera_sync.get_sync_groups()
for group in groups.groups:
    print(group.id, group.tolerance_ms, group.missing_policy, group.emitted_sets, group.dropped_sets)
```

### capture_synced

同步抓取一组多相机帧。帧默认经共享内存传输；本机不支持或读取失败时客户端自动改用内联传输重试一次。

```python
capture_synced(*, group_id: str = "", wait_for_fresh: bool = True, timeout_ms: int = 5000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> SyncedFrameSet
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `group_id` | `str` | `""` | 同步组 id；空串用配置里的缺省组 |
| `wait_for_fresh` | `bool` | `True` | 是否等待一组新帧；`False` 允许返回最近一组 |
| `timeout_ms` | `int` | `5000` | 抓取超时（毫秒） |
| `transport_hint` | `FrameTransportHint` | `AUTO` | 帧传输方式偏好：`AUTO` / `SHM_ONLY` / `INLINE_REQUIRED` |
| `client_boot_id` | `str` | `""` | 客户端启动标识；空串由客户端自动填本机值 |

**返回** `SyncedFrameSet`

| 字段 | 类型 | 说明 |
|------|------|------|
| `group_id` | `str` | 命中的同步组 id |
| `sequence` | `int` | 帧集序号 |
| `target_stamp_ns` | `int` | 本组对齐的目标时刻（纳秒） |
| `clock_domain` / `clock_epoch_id` | `str` | 时戳所在时基与纪元 |
| `ptp_locked` | `bool` | 本组是否在 PTP 锁定下对齐 |
| `tolerance_ns` | `int` | 实际生效的时间容差（纳秒） |
| `max_uncertainty_ns` | `int` | 成员时戳的最大不确定度（纳秒） |
| `expires_at_ns` | `int` | 帧集过期时刻（纳秒） |
| `complete` | `bool` | 是否所有成员都匹配到帧 |
| `sync_status` | `TemporalSyncStatus` | 时间同步状态 |
| `members` | `list[SyncedMember]` | 成员帧 |
| `frames` | `list[ImageFrame]` | 成员帧的平铺列表 |

**`SyncedMember` 字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 相机槽位 |
| `stream` | `StreamKind` | 流类型 |
| `match_status` | `MemberMatchStatus` | 匹配结果 |
| `delta_ns` | `int` | 与目标时刻的偏差（纳秒） |
| `timestamp_uncertainty_ns` | `int` | 该成员时戳的不确定度（纳秒） |
| `frame` | `ImageFrame \| None` | 帧数据；缺失时为 `None` |

`ImageFrame` 的字段见 [相机 Camera](../camera.md) 的 `color` 通道。

```python
from fabot.capabilities.camera import FrameTransportHint

frame_set = robot.skills.camera_sync.capture_synced(group_id="front_cameras", transport_hint=FrameTransportHint.AUTO)
print(frame_set.sequence, frame_set.complete, frame_set.sync_status, frame_set.max_uncertainty_ns)
for member in frame_set.members:
    print(member.slot, member.match_status, member.delta_ns, member.frame is not None)
```

**枚举**

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

| `TemporalSyncStatus` | 含义 |
|-----------------------|------|
| `HARDWARE_SYNCED` | 硬件同步（如 PTP / 触发线）下对齐 |
| `SOFTWARE_MATCHED` | 软件按时间戳匹配 |
| `PARTIAL` | 只有部分成员对上了 |
| `TIMEOUT` | 凑组超时 |
| `INVALID_CLOCK` | 时钟域或纪元不一致 |

以上枚举与 `StreamKind` 均带 `UNKNOWN`，表示未上报。

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../../usage/events-channels.md)。

### synced_frames

同步帧集流。

```python
synced_frames(qos_profile: str = "latest") -> SyncedFramesChannel
```

帧 payload 为 `SyncedFrameSet`（字段见 `capture_synced`），外层帧包装 `SyncedFramesChannelFrame` 带 `channel_id` / `sequence` / `timestamp_us` / `payload`。

`frames(poll_timeout_ms=1000, timeout_ms=None)` 的 `timeout_ms` 为 `None` 时只受 `poll_timeout_ms` 节流、不设总上限；`next()` 不传参时默认等 5 秒。

```python
ch = robot.skills.camera_sync.synced_frames(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.complete, frame.payload.target_stamp_ns)
finally:
    ch.close()
```

### sync_groups

同步组清单变化通道。它只有 `info` 属性与租约操作（`id` / `descriptor` / `renew()` / `close()`），不产出帧。

```python
sync_groups(qos_profile: str = "latest") -> SyncGroupsChannel
```

`info` 返回 `SyncGroupList`；通道未携带 info 表示时抛 `RuntimeError`。需要每帧内容时用 `synced_frames()`。

## 事件

经 `robot.skills.camera_sync.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`。

| 入口 | 事件类型 | payload |
|------|------|------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`：`Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`：`CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | 通配订阅 | `Event` |

```python
def on_fault(event):
    print(event.header.timestamp_us, event.faults.revision, len(event.faults.records))

token = robot.skills.camera_sync.events.fault_changed.subscribe(on_fault)
# ...
token.close()
```

## 异常

`robot.skills.camera_sync.faults()` 返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的文本用 `Catalogs.format_fault(record)`，见 [文本目录 Catalogs](../catalogs.md)。

抓帧失败的两类典型错误：`capture_synced` 超时抛 `Timeout`；帧经共享内存传出错且内联重试仍失败时抛帧传输错误（`FrameError` 系），此时把 `transport_hint` 显式设为 `INLINE_REQUIRED` 可绕过共享内存。见 [错误处理](../../../usage/errors.md)。

## 状态

`status()` 返回只读状态袋；整机聚合里没有技能字段。状态未上报时抛 `RuntimeError`。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `clock_domain` | `str` | `host_monotonic` | 同步所用时钟域 |
| `clock_epoch_id` | `str` | `host_monotonic` | 时钟纪元标识 |
| `ptp_locked` | `bool` | `False` | PTP 是否锁定 |
| `active_group_count` | `int` | `0` | 活跃同步组数 |
| `region_overrun_total` | `int` | `0` | 帧区域保留超限累计 |

公共只读查询：`health()` 返回 `SlotHealth`，`lifecycle()` 返回 `CapabilityLifecycleSnapshot`。

## 资源

本技能没有 Operation，不占用资源：`capture_synced` 是短 Command，帧数据经共享内存或内联传输回客户端；`synced_frames` / `sync_groups` 是通道订阅，按租约管理。

## 配置域

`CameraSyncConfig`（`SKILL_ID` 与 `ADAPTER_ID` 均为 `fabot_camera_sync`），两个配置域：`alignment` / `frame_region`。

```python
with robot.skills.camera_sync.edit_config() as conf:
    conf.alignment.groups[0].tolerance_ms = 8
# 退出时只提交 alignment 域
```

**`alignment`**

| 字段 | 默认 | 说明 |
|------|------|------|
| `groups` | 一组 `front_cameras` | 同步分组列表 |

**`alignment.groups[]`**

| 字段 | 默认 | 说明 |
|------|------|------|
| `id` | `front_cameras` | 分组标识，进入输出话题与状态命名，必须唯一 |
| `inputs` | 四路彩色（`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`） | 组内输入流 |
| `tolerance_ms` | `16` | 组内时间允许的最大偏差；`0` 或缺省时按 `1/min(fps)` 推导 |
| `max_wait_ms` | `33` | 凑齐一帧集的最长等待，超时按 `missing_policy` 处理 |
| `queue_depth` | `8` | 每路输入的缓冲帧数 |
| `missing_policy` | `drop_set` | `drop_set` / `emit_partial` / `reuse_latest` |
| `reuse_max_age_ms` | `1000` | `reuse_latest` 时可用旧帧的最大年龄 |
| `clock` | `host_receive` / `33.334` | `fallback` / `max_uncertainty_ms` |

**`alignment.groups[].inputs[]`**

| 字段 | 默认 | 说明 |
|------|------|------|
| `slot` | `head_camera` | 相机所在逻辑槽位名 |
| `stream` | `color` | `color` / `depth` / `registered_depth` / `infrared` / `infrared_left` / `infrared_right` |
| `fps` | `30` | 该路期望帧率（赫兹），组内各路应一致 |
| `encoding` | `rgb8` | 像素格式，决定 lane 预算；留空按 `stream` 推断 |
| `max_width` / `max_height` | `1280` / `720` | 该路最大宽高（像素），用于预分配 lane 缓冲 |

**`frame_region`**

| 字段 | 默认 | 说明 |
|------|------|------|
| `retention_ms` | `1000` | reader 可读窗口（毫秒）；超出后读取返回 `shared_region_expired` |
| `max_region_bytes` | `536870912` | 整块区域上限（字节）；必须容纳槽位数 × 组内成员数 × 每路 lane 预算 |

枚举取值的合法项用 `CameraSyncConfig.field_options()` 读，不要硬编码。

## 相关

- 技能概念与可用性判断：[技能与扩展](../../../usage/skills.md)
- 相机硬件与流：[相机 Camera](../camera.md)
- 配置域读写：[配置管理](../../../usage/configuration.md)
- 命令与超时：[命令与长时操作](../../../usage/commands-operations.md)
