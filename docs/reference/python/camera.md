---
title: 相机 Camera
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 相机 Camera

## 模块概述

- 能力 id：`camera`；槽位：`robot.head_camera` / `robot.chest_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera`
- 相机接入与图像流：单帧抓取、开流配置、图像帧通道与预览播放地址。四个槽位是同一套 API、各自独立的相机。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `capture` | — | `CaptureT` | Command |
| `capture_color` | — | `ColorCaptureT` | Command |
| `capture_depth` | — | `DepthCaptureT` | Command |
| `open` | `profiles`, `enable_sync` | `CameraSessionT` | Command |
| `close` | — | `CameraSessionT` | Command |

Command 默认 `timeout_ms`：`capture` / `capture_color` / `capture_depth` 为 10000，`open` / `close` 为 3000（均可覆盖）。参数均为关键字参数。本模块没有 Operation。

| 通道 | 内容 |
|------|------|
| `frameset()` | 帧组流（`CameraFrameSetT`，彩色 / 深度 / 红外一组） |
| `color()` | 彩色图像流（`ImageFrameT`） |
| `depth()` | 深度图像流（`ImageFrameT`） |
| `rtsp()` | RTSP 预览播放地址（`StreamUrlT`，无帧迭代） |
| `webrtc()` | WebRTC 预览播放地址（`StreamUrlT`，无帧迭代） |

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

抓取类方法回传整帧图像、体积较大，默认超时相应放宽；实时预览应订阅通道，不要依赖高频抓取。

### capture

抓取当前一组帧（彩色 + 深度）。

```python
capture(*, timeout_ms: int = 10000) -> CaptureT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`CaptureT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `color` | `ImageFrameT` \| `None` | 彩色帧 |
| `depth` | `ImageFrameT` \| `None` | 深度帧 |
| `synchronized` | `bool` | 两帧是否同步采集 |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

`ImageFrameT` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sequence` | `int` | 帧序号 |
| `width` / `height` | `int` | 图像宽 / 高（像素） |
| `encoding` | `str` | 像素编码（如 `rgb8`） |
| `data` | `list[int]` | 像素字节 |
| `frameId` | `str` | 坐标系 id |
| `stampNs` | `int` | 采集时间戳（纳秒） |
| `isBigendian` | `int` | 是否大端 |
| `step` | `int` | 每行字节数 |
| `cameraSlot` | `str` | 来源槽位 |
| `stream` | `int` | 流类型（`StreamKind`） |

```python
shot = robot.head_camera.capture()
if shot.outcome is not None and shot.outcome.success:
    print(shot.color.width, shot.color.height, shot.synchronized)
```

### capture_color

只抓取彩色帧。

```python
capture_color(*, timeout_ms: int = 10000) -> ColorCaptureT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`ColorCaptureT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `image` | `ImageFrameT` \| `None` | 彩色帧 |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

### capture_depth

只抓取深度帧。

```python
capture_depth(*, timeout_ms: int = 10000) -> DepthCaptureT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `10000` | Command 超时（毫秒） |

**返回**

`DepthCaptureT`：`image`（`ImageFrameT`）/ `outcome`（`OutcomeT`），同 `capture_color`。

### open

按给定流配置打开相机会话。

```python
open(*, profiles: list[StreamProfileT], enable_sync: bool, timeout_ms: int = 3000) -> CameraSessionT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `profiles` | `list[StreamProfileT]` | （必填） | 要开启的流配置列表 |
| `enable_sync` | `bool` | （必填） | 是否启用多流同步 |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

`StreamProfileT` 字段：`stream`（`StreamKind`：`COLOR` / `DEPTH` / `INFRARED`）、`width` / `height`（像素）、`fps`、`encoding`（`str`）、`alignedTo`（对齐到哪个流）。

**返回**

`CameraSessionT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `cameraSlot` | `str` | 相机槽位 |
| `state` | `int` | 设备状态（`DeviceState`：`IDLE` / `STREAMING` 等） |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

```python
from fabot.capabilities.camera import StreamKind, StreamProfileT

profile = StreamProfileT()
profile.stream = StreamKind.COLOR
profile.width, profile.height, profile.fps = 1280, 720, 30
profile.encoding = "rgb8"
session = robot.head_camera.open(profiles=[profile], enable_sync=True)
print(session.state, session.outcome.statusMessage)
```

### close

关闭相机会话。

```python
close(*, timeout_ms: int = 3000) -> CameraSessionT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`CameraSessionT`：`cameraSlot` / `state` / `outcome`，同 `open`。

```python
session = robot.head_camera.close()
print(session.state, session.outcome.statusMessage)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。以下示例以 `robot.head_camera` 为例，其余相机槽位同理。

### frameset()

订阅帧组流：每组包含彩色 / 深度 / 红外帧。

```python
frameset(qos_profile: str = "latest") -> FramesetChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`FramesetChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `CameraFrameSetT` | 帧组 |

`payload`（`CameraFrameSetT`）字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `cameraSlot` | `str` | 来源槽位 |
| `sequence` | `int` | 帧组序号 |
| `stampNs` | `int` | 采集时间戳（纳秒） |
| `color` / `depth` / `infrared` | `ImageFrameT` \| `None` | 各路图像帧 |
| `synchronized` | `bool` | 是否同步采集 |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.head_camera.frameset(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    fs = frame.payload
    print(frame.sequence, fs.synchronized, fs.color.width if fs.color else None)
```

### color()

订阅彩色图像流。

```python
color(qos_profile: str = "latest") -> ColorChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`ColorChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `ImageFrameT` | 彩色图像帧，字段见 [capture](#capture) |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.chest_camera.color(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.sequence, frame.payload.width, frame.payload.height)
```

### depth()

订阅深度图像流。打开参数与帧字段同 `color()`，帧类型为 `DepthChannelFrame`，`payload` 为深度 `ImageFrameT`。

```python
depth(qos_profile: str = "latest") -> DepthChannel
```

```python
ch = robot.head_camera.depth(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.sequence, frame.payload.encoding)
```

### rtsp()

获取 RTSP 预览播放地址。这是 info-only 通道：没有 `frames()`，播放地址经 `info` 属性读取；支持 `renew()` / `close()` 与 `with` 上下文。

```python
rtsp(qos_profile: str = "latest") -> RtspChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**info**（`StreamUrlT`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `cameraSlot` | `str` | 相机槽位 |
| `url` | `str` | 播放地址 |
| `outcome` | `OutcomeT` \| `None` | `success` / `statusMessage` |

```python
with robot.head_camera.rtsp() as ch:
    print(ch.info.url)
```

### webrtc()

获取 WebRTC 预览播放地址。与 `rtsp()` 同为 info-only 通道：`info` 为 `StreamUrlT`，支持 `renew()` / `close()` 与 `with` 上下文。

```python
webrtc(qos_profile: str = "latest") -> WebrtcChannel
```

```python
with robot.head_camera.webrtc() as ch:
    print(ch.info.url)
```

## 事件

经各槽位的 `events` 订阅（如 `robot.head_camera.events`，其余相机同理）。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.head_camera.events.fault_changed.subscribe(callback)`（其余槽位同理）。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.head_camera.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.head_camera.events.lifecycle_changed.subscribe(callback)`（其余槽位同理）。

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

token = robot.chest_camera.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：各槽位的 `faults()`（如 `robot.head_camera.faults()`），返回 `Faults`。

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

本模块没有 `status()`；整机聚合状态见 `robot.status()`。设备状态经 `open()` / `close()` 返回的 `CameraSessionT.state`（`DeviceState`）获取。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

同一相机槽位上的 `open` / `close` 共享 `camera_control` 资源，新请求排队执行。抓取与通道订阅不占用该资源。
