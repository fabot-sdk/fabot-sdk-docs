---
title: 相机 Camera
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 相机 Camera

## 模块概述

- 能力 id：`camera`；槽位：`robot.head_camera` / `robot.chest_camera` / `robot.waist_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera`
- 能力域：`perception`；能力版本：`1.1.0`
- 相机能力覆盖彩色、深度、配准深度、红外、置信度、点云与 IMU 流，以及标定、成像控制与软件触发。
- 空间配准用 `registration_mode`（`registered_*` 流），时间配对用 `enable_stream_sync`（`FrameSet.sync_status`），两者是不同维度。

能力激活后默认自动开流，通常无需手动 `open()`；需要换流配置或重开会话时再调用。
`camera.depth` 恒为原始深度光学系；配准到彩色的深度只出现在 `registered_depth()` 与 `FrameSet.registered_depth`。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `get_info` | `Empty` | `DeviceInfo` | 1000 ms |
| `get_state` | `Empty` | `SessionState` | 1000 ms |
| `open` | `SessionConfig` | `SessionState` | 5000 ms |
| `close` | `Empty` | `SessionState` | 3000 ms |
| `capture` | `CaptureOptions` | `FrameSet` | 10000 ms |
| `trigger` | `TriggerPulse` | `TriggerAck` | 2000 ms |
| `get_calibration` | `Empty` | `CameraCalibration` | 1000 ms |
| `get_imaging` | `Empty` | `ImagingState` | 1000 ms |
| `set_imaging` | `ImagingPatch` | `ImagingState` | 2000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

| 通道 | 内容 |
|------|------|
| `frameset()` | `FrameSet` |
| `color()` | `ImageFrame` |
| `depth()` | `ImageFrame` |
| `registered_depth()` | `ImageFrame` |
| `infrared()` | `ImageFrame` |
| `infrared_left()` | `ImageFrame` |
| `infrared_right()` | `ImageFrame` |
| `confidence()` | `ImageFrame` |
| `points()` | `PointCloud` |
| `imu()` | `ImuSample` |
| `rtsp()` | `MediaEndpoint`（媒体端点，非帧迭代） |
| `webrtc()` | `MediaEndpoint`（媒体端点，非帧迭代） |

本页方法用到的枚举：

**`StreamKind` 枚举**

| 取值 | 说明 |
|------|------|
| `COLOR` | 彩色 |
| `DEPTH` | 原始深度 |
| `REGISTERED_DEPTH` | 配准到彩色的深度 |
| `INFRARED` | 红外 |
| `INFRARED_LEFT` | 左红外 |
| `INFRARED_RIGHT` | 右红外 |
| `CONFIDENCE` | 置信度 |
| `THERMAL` | 热成像 |

**`RegistrationMode` 枚举**

| 取值 | 说明 |
|------|------|
| `NONE` | 不做配准 |
| `HARDWARE` | 硬件配准 |
| `SOFTWARE` | 软件配准 |

**`FrameTransportHint` 枚举**

| 取值 | 说明 |
|------|------|
| `AUTO` | 自动选择 |
| `SHM_ONLY` | 只允许共享内存 |
| `INLINE_REQUIRED` | 必须内联传输 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### get_info

读取设备信息：厂商、型号、序列号、连接方式与支持能力。

```python
get_info(*, timeout_ms: int = 1000) -> DeviceInfo
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `DeviceInfo`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `vendor` | `str` | 厂商 |
| `model` | `str` | 型号 |
| `serial_number` | `str` | 序列号 |
| `firmware_version` | `str` | 固件版本 |
| `connection_type` | `ConnectionType` | 物理连接类型（`ConnectionType`） |
| `supported_streams` | `list[StreamKind]` | 支持的流类型 |
| `supported_profiles` | `list[StreamProfile]` | 支持的流配置 |
| `supports_hardware_registration` | `bool` | 是否支持硬件像素配准 |
| `supports_software_registration` | `bool` | 是否支持软件像素配准 |
| `supports_hardware_sync` | `bool` | 是否支持硬件同步 |
| `supports_software_trigger` | `bool` | 是否支持软件触发 |
| `has_imu` | `bool` | 是否带 IMU |
| `has_emitter` | `bool` | 是否带红外发射器 |

### get_state

读取当前会话状态（开流、同步、配准、标定代际与温度）。

```python
get_state(*, timeout_ms: int = 1000) -> SessionState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `SessionState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `state` | `DeviceState` | 状态取值 |
| `sync_mode` | `HardwareSyncMode` | 硬件同步角色（`SyncMode`） |
| `registration_mode` | `RegistrationMode` | 像素配准方式（`RegistrationMode`） |
| `enable_stream_sync` | `bool` | 是否开启多流时间配对 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `active_streams` | `list[ActiveStreamStatus]` | 当前活跃流及其实测帧率 |
| `awaiting_external_trigger` | `bool` | 是否在等待外部触发 |
| `temperature_c` | `float` | 温度，摄氏度 |
| `status_message` | `str` | 状态说明文本 |

### open

开启会话。`profiles` 为空沿用设备缺省；`registration_mode` 选择像素配准；`enable_stream_sync` 开启多流时间配对。

```python
open(*, profiles: list[StreamProfile] | None = None, enable_stream_sync: bool = True, registration_mode: RegistrationMode = RegistrationMode.NONE, enable_imu: bool = False, timeout_ms: int = 5000) -> SessionState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `profiles` | `list[StreamProfile] | None` | `None` | 要开启的流配置；`None` 表示沿用设备缺省 |
| `enable_stream_sync` | `bool` | `True` | 是否开启多流时间配对 |
| `registration_mode` | `RegistrationMode` | `RegistrationMode.NONE` | 像素配准方式 |
| `enable_imu` | `bool` | `False` | 是否开启 IMU |
| `timeout_ms` | `int` | `5000` | 调用超时（毫秒） |

**返回** `SessionState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `state` | `DeviceState` | 状态取值 |
| `sync_mode` | `HardwareSyncMode` | 硬件同步角色（`SyncMode`） |
| `registration_mode` | `RegistrationMode` | 像素配准方式（`RegistrationMode`） |
| `enable_stream_sync` | `bool` | 是否开启多流时间配对 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `active_streams` | `list[ActiveStreamStatus]` | 当前活跃流及其实测帧率 |
| `awaiting_external_trigger` | `bool` | 是否在等待外部触发 |
| `temperature_c` | `float` | 温度，摄氏度 |
| `status_message` | `str` | 状态说明文本 |

### close

关闭相机会话并停止全部流。

```python
close(*, timeout_ms: int = 3000) -> SessionState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回** `SessionState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `state` | `DeviceState` | 状态取值 |
| `sync_mode` | `HardwareSyncMode` | 硬件同步角色（`SyncMode`） |
| `registration_mode` | `RegistrationMode` | 像素配准方式（`RegistrationMode`） |
| `enable_stream_sync` | `bool` | 是否开启多流时间配对 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `active_streams` | `list[ActiveStreamStatus]` | 当前活跃流及其实测帧率 |
| `awaiting_external_trigger` | `bool` | 是否在等待外部触发 |
| `temperature_c` | `float` | 温度，摄氏度 |
| `status_message` | `str` | 状态说明文本 |

### capture

抓取一帧多流集合。大帧优先走共享内存，取不到时自动回退内联传输；`wait_for_fresh=True` 会等待新帧，`max_age_ms` 限定可接受的缓存帧年龄。

```python
capture(*, streams: list[StreamKind] | None = None, wait_for_fresh: bool = True, max_age_ms: int = 500, timeout_ms: int = 8000, transport_hint: FrameTransportHint = FrameTransportHint.AUTO, client_boot_id: str = "") -> FrameSet
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `streams` | `list[StreamKind] | None` | `None` | 要抓取的流；`None` 表示全部可用流 |
| `wait_for_fresh` | `bool` | `True` | 是否等待新帧 |
| `max_age_ms` | `int` | `500` | 缓存帧最大年龄（毫秒） |
| `timeout_ms` | `int` | `8000` | 调用超时（毫秒） |
| `transport_hint` | `FrameTransportHint` | `FrameTransportHint.AUTO` | 帧传输方式偏好 |
| `client_boot_id` | `str` | `""` | 客户端启动标识；空串自动填充 |

**返回** `FrameSet`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `sequence` | `int` | 序号，从 0 递增 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `sync_status` | `SyncStatus` | 多流时间配对状态（`SyncStatus`） |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `color` | `ImageFrame` | 颜色 |
| `depth` | `ImageFrame` | 深度数据 |
| `registered_depth` | `ImageFrame` | 配准到彩色的深度流 |
| `infrared` | `ImageFrame` | 红外流 |
| `infrared_left` | `ImageFrame` | 左红外流 |
| `infrared_right` | `ImageFrame` | 右红外流 |
| `confidence` | `ImageFrame` | 置信度数据 |

```python
frame_set = robot.head_camera.capture()
print(frame_set.sequence, frame_set.sync_status)
if frame_set.color is not None:
    print(frame_set.color.width, frame_set.color.height, frame_set.color.frame_id)
```

### trigger

发出外部触发脉冲，用于 `SOFTWARE_TRIGGER` 同步角色。

```python
trigger(*, frame_count: int = 1, timeout_ms: int = 2000) -> TriggerAck
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `frame_count` | `int` | `1` | 触发帧数 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `TriggerAck`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `trigger_sequence` | `int` | 触发序号 |
| `accepted_at_ns` | `int` | 受理时刻（纳秒） |

### get_calibration

读取标定数据：各流内参、深度到彩色 / 左右红外 / IMU 到彩色的外参、双目基线、深度换算系数与有效深度范围。`generation` 变化表示标定已更新。

```python
get_calibration(*, timeout_ms: int = 1000) -> CameraCalibration
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `CameraCalibration`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `generation` | `int` | 内部状态代际 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `min_depth_m` | `float` | 有效深度下限，米 |
| `max_depth_m` | `float` | 有效深度上限，米 |
| `color` | `OpticalIntrinsics` | 颜色 |
| `depth` | `OpticalIntrinsics` | 深度数据 |
| `registered_depth` | `OpticalIntrinsics` | 配准到彩色的深度流 |
| `infrared` | `OpticalIntrinsics` | 红外流 |
| `infrared_left` | `OpticalIntrinsics` | 左红外流 |
| `infrared_right` | `OpticalIntrinsics` | 右红外流 |
| `depth_to_color` | `Transform3d` | 深度到彩色的外参 |
| `infrared_left_to_right` | `Transform3d` | 左右红外之间的外参 |
| `imu_to_color` | `Transform3d` | IMU 到彩色的外参 |
| `stereo_baseline` | `StereoBaseline` | 双目基线与参考平面距离 |

```python
calib = robot.head_camera.get_calibration()
print(calib.generation, calib.depth_scale)
print(calib.color.fx, calib.color.fy, calib.color.cx, calib.color.cy)
print(calib.depth_to_color.tx, calib.depth_to_color.qw)
```

### get_imaging

读取成像控制参数（曝光、增益、白平衡、工频、红外发射器）。

```python
get_imaging(*, timeout_ms: int = 1000) -> ImagingState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `ImagingState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `color` | `ColorImagingControl` | 颜色 |
| `depth` | `DepthImagingControl` | 深度数据 |
| `ae_strategy` | `AutoExposureStrategy` | 自动曝光策略（`AutoExposureStrategy`） |

### set_imaging

整体替换成像控制参数，返回生效状态。

```python
set_imaging(*, color: ColorImagingControl, depth: DepthImagingControl, ae_strategy: AutoExposureStrategy, timeout_ms: int = 2000) -> ImagingState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `color` | `ColorImagingControl` | （必填） | 彩色成像控制 |
| `depth` | `DepthImagingControl` | （必填） | 深度成像控制 |
| `ae_strategy` | `AutoExposureStrategy` | （必填） | 自动曝光策略 |
| `timeout_ms` | `int` | `2000` | 调用超时（毫秒） |

**返回** `ImagingState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `color` | `ColorImagingControl` | 颜色 |
| `depth` | `DepthImagingControl` | 深度数据 |
| `ae_strategy` | `AutoExposureStrategy` | 自动曝光策略（`AutoExposureStrategy`） |

```python
from fabot.capabilities.camera import (
    AutoExposureStrategy, ColorImagingControl, DepthImagingControl, SensorExposureControl,
)

state = robot.head_camera.set_imaging(
    color=ColorImagingControl(exposure=SensorExposureControl(exposure_us=8000)),
    depth=DepthImagingControl(),
    ae_strategy=AutoExposureStrategy.MOTION_PRIORITY,
)
print(state.ae_strategy)
```

## 通道

打开即建立租约并返回 Channel 句柄；用 `frames()` 迭代，`next()` 取一帧，`renew()` 续租，`close()` 释放。通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### frameset()

多流成帧快照流。

```python
frameset(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `FrameSet`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `sequence` | `int` | 序号，从 0 递增 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `sync_status` | `SyncStatus` | 多流时间配对状态（`SyncStatus`） |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `color` | `ImageFrame` | 颜色 |
| `depth` | `ImageFrame` | 深度数据 |
| `registered_depth` | `ImageFrame` | 配准到彩色的深度流 |
| `infrared` | `ImageFrame` | 红外流 |
| `infrared_left` | `ImageFrame` | 左红外流 |
| `infrared_right` | `ImageFrame` | 右红外流 |
| `confidence` | `ImageFrame` | 置信度数据 |

### color()

彩色图像流。

```python
color(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

```python
ch = robot.head_camera.color(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.width, frame.payload.height)
finally:
    ch.close()
```

### depth()

原始深度流。

```python
depth(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### registered_depth()

配准到彩色的深度流。

```python
registered_depth(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### infrared()

红外流。

```python
infrared(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### infrared_left()

左红外流。

```python
infrared_left(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### infrared_right()

右红外流。

```python
infrared_right(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### confidence()

置信度流。

```python
confidence(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImageFrame`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `stream` | `StreamKind` | 流类型（`StreamKind`） |
| `registered_to` | `StreamKind` | 配准目标流；`UNKNOWN` 表示未配准 |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `host_receive_stamp_ns` | `int` | 主机侧接收时刻（纳秒） |
| `exposure_duration_us` | `int` | 曝光时长（微秒） |
| `trigger_id` | `int` | 触发序号 |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `format` | `PixelFormat` | 像素格式（`PixelFormat`） |
| `step` | `int` | 行字节宽度 |
| `is_bigendian` | `bool` | 是否大端字节序 |
| `depth_scale` | `float` | 深度换算系数，米 / LSB |
| `data` | `list[int]` | 音频字节 |

### points()

点云流。

```python
points(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `PointCloud`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `sequence` | `int` | 序号，从 0 递增 |
| `source_sequence` | `int` | 对应的源帧序号 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `calibration_generation` | `int` | 标定代际；变化表示需要重新读取内参 |
| `decimation` | `int` | 点云抽样步长 |
| `positions` | `list[float]` | 位置数组；点云按 X/Y/Z 依次展开 |
| `colors` | `list[int]` | 颜色数组，RGB 依次展开 |

### imu()

IMU 采样流。

```python
imu(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `ImuSample`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `sequence` | `int` | 序号，从 0 递增 |
| `frame_id` | `str` | 参考坐标系名；命令里空串表示槽位缺省基准，反馈原样保留来源系 |
| `stamp_ns` | `int` | 机器人时基上的时间戳（纳秒）；0 表示最新 |
| `clock_domain` | `str` | 时戳所在时基 |
| `clock_quality` | `ClockQuality` | 时戳质量（`ClockQuality`） |
| `sensor_stamp_ns` | `int` | 传感器侧采集时刻（纳秒） |
| `linear_acceleration` | `Vector3d` | 线加速度，米/秒² |
| `angular_velocity` | `Vector3d` | 角速度，弧度/秒 |
| `temperature_c` | `float` | 温度，摄氏度 |

### rtsp()

RTSP 预览端点；推送的是媒体描述而不是图像帧。

```python
rtsp(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `MediaEndpoint`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `uri` | `str` | 图片 / 视频 / 音频资源地址 |
| `protocol` | `MediaProtocol` | 媒体协议（`MediaProtocol`） |
| `codec` | `VideoCodec` | 视频编码（`VideoCodec`） |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `fps` | `int` | 帧率 |
| `bitrate_bps` | `int` | 码率，比特/秒 |
| `lease_id` | `str` | 流租约 id |
| `pipeline_generation` | `int` | 管线代际；变化表示预览需要重新协商 |

### webrtc()

WebRTC 预览端点；推送的是媒体描述而不是图像帧。

```python
webrtc(qos_profile: str = "latest") -> Channel
```

帧 payload 为 `MediaEndpoint`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot` | `str` | 槽位 id |
| `uri` | `str` | 图片 / 视频 / 音频资源地址 |
| `protocol` | `MediaProtocol` | 媒体协议（`MediaProtocol`） |
| `codec` | `VideoCodec` | 视频编码（`VideoCodec`） |
| `width` | `int` | 宽度，像素 |
| `height` | `int` | 高度，像素 |
| `fps` | `int` | 帧率 |
| `bitrate_bps` | `int` | 码率，比特/秒 |
| `lease_id` | `str` | 流租约 id |
| `pipeline_generation` | `int` | 管线代际；变化表示预览需要重新协商 |

## 事件

经 `robot.<slot>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.<slot>.events.camera_session_changed` | `CameraSessionChangedEvent` | `camera_session_changed` |
| `robot.<slot>.events.camera_calibration_changed` | `CameraCalibrationChangedEvent` | `camera_calibration_changed` |
| `robot.<slot>.events.camera_device_connection_changed` | `CameraDeviceConnectionChangedEvent` | `camera_device_connection_changed` |
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`：`Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot` |

### camera_session_changed

会话状态变化时推送，`payload` 为 `SessionState`。

### camera_calibration_changed

标定更新时推送，`payload` 为 `CameraCalibration`；收到后应重新读取内参与外参。

### camera_device_connection_changed

设备连断时推送，`payload` 为 `DeviceConnectionEvent`。

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
| `state` | `str` | `disconnected` | `disconnected` / `idle` / `streaming` / `fault` |
| `sync_mode` | `str` | `standalone` | `standalone` / `primary` / `secondary` / `hardware_trigger` / `software_trigger` |
| `registration_mode` | `str` | `none` | `none` / `hardware` / `software` |
| `color_active` | `bool` | `False` |  |
| `depth_active` | `bool` | `False` |  |
| `infrared_active` | `bool` | `False` |  |
| `imu_active` | `bool` | `False` |  |
| `calibration_generation` | `uint64` | `0` | 标定代际；变化表示需要重新读取内参 |
| `temperature_c` | `float` | `0.0` | 温度，摄氏度 |

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

`open` / `close` / `set_imaging` 共用资源 `camera_device`，策略 `queue`。`capture` / `trigger` 与其余命令不占资源。
