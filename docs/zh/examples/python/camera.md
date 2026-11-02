---
title: 相机
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 相机

抓取多流帧、读取标定与内参、控制成像参数，并订阅图像流与预览地址。相机有五个槽位（`head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera`），同一套 API、各自独立。通道模型见 [事件与数据通道](../../usage/events-channels.md)，接口与字段见 [相机](../../reference/python/camera.md)。

## 抓取一组帧

`capture` 抓取一组多流帧，返回 `FrameSet`：`color` / `depth` / `registered_depth` / `infrared` / 左右红外 / `confidence` 各是一个 `ImageFrame`（缺流时为 `None`），`sync_status` 表示这些流的时间配对情况。能力激活后相机默认自动开流，通常无需先 `open()`。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    frame_set = robot.head_camera.capture()
    print("序号:", frame_set.sequence, "同步:", frame_set.sync_status)

    if frame_set.color is not None:
        img = frame_set.color
        print(img.width, img.height, img.format, img.frame_id, img.stamp_ns)
        print(len(img.data), "bytes")
```

`capture(streams=[...])` 可只取需要的流；`wait_for_fresh=False` 允许返回缓存帧，此时 `max_age_ms` 限定可接受的帧年龄。

```python
from fabot.capabilities.camera import StreamKind

depth_only = robot.head_camera.capture(streams=[StreamKind.DEPTH], max_age_ms=200)
```

## 读取标定与内参

`get_calibration()` 一次给出各流内参、外参、双目基线与深度换算系数；`get_intrinsics` 是它的别名。`generation` 变化表示标定已更新，应重新读取。

```python
calib = robot.head_camera.get_calibration()
print("标定代际:", calib.generation, "深度换算:", calib.depth_scale)
print("有效深度:", calib.min_depth_m, calib.max_depth_m)

intr = calib.color
print(intr.width, intr.height, intr.fx, intr.fy, intr.cx, intr.cy)
print("畸变模型:", intr.distortion_model, "系数:", intr.distortion)

# 深度到彩色的外参
print(calib.depth_to_color.target_frame, calib.depth_to_color.source_frame)
print(calib.depth_to_color.tx, calib.depth_to_color.qw)
```

## 深度反投影成点云

`fabot.frames` 提供像素与深度的几何换算，配合标定即可把深度图变成三维点：

```python
from fabot.frames import deproject_depth_to_points, select_depth_intrinsics

frame_set = robot.head_camera.capture(streams=[StreamKind.DEPTH])
intr = select_depth_intrinsics(frame_set.depth, calib)
points = deproject_depth_to_points(frame_set.depth, intr, stride=2, max_depth=5.0)
print(points.shape)      # (N, 3)，单位米，在深度光学系

# 再换到机器人基准系
points_base = robot.frames.transform_points(points, "base_link", frame_set.depth.frame_id)
```

## 控制成像参数

`set_imaging` 整体替换曝光 / 增益 / 白平衡 / 工频 / 发射器设置，并返回生效状态：

```python
from fabot.capabilities.camera import (
    AutoExposureStrategy, ColorImagingControl, DepthImagingControl, ExposureMode,
    SensorExposureControl,
)

state = robot.head_camera.set_imaging(
    color=ColorImagingControl(
        exposure=SensorExposureControl(mode=ExposureMode.MANUAL, exposure_us=8000),
    ),
    depth=DepthImagingControl(),
    ae_strategy=AutoExposureStrategy.MOTION_PRIORITY,
)
print(state.ae_strategy)
```

枚举字段请用枚举常量（如 `ExposureMode.MANUAL`），传字符串会在序列化时报类型错误。

## 软件触发

同步角色为 `SOFTWARE_TRIGGER` 的相机可用 `trigger()` 主动出帧：

```python
ack = robot.head_camera.trigger(frame_count=1)
print(ack.trigger_sequence, ack.accepted_at_ns)
```

## 订阅图像流

`color()` 推送 `ImageFrame`，`frameset()` 推送整组 `FrameSet`，另有 `depth()` / `registered_depth()` / `infrared()` / 左右红外 / `confidence()` / `points()` / `imu()`。

```python
ch = robot.head_camera.color(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.width, frame.payload.height)
finally:
    ch.close()
```

## 预览地址

`rtsp()` / `webrtc()` 推送的是媒体端点描述（`MediaEndpoint`），不是图像帧，适合直接把播放地址交给播放器：

```python
ch = robot.head_camera.rtsp()
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.payload.uri, frame.payload.codec, frame.payload.width)
        break
finally:
    ch.close()
```

## 订阅相机事件

相机会话与标定的变化有专属事件，不必轮询：

```python
def on_session(event):
    st = event.camera_session
    print(st.state, st.registration_mode, st.calibration_generation)

def on_calibration(event):
    print("标定更新:", event.camera_calibration.generation)

session_token = robot.head_camera.events.camera_session_changed.subscribe(on_session)
calib_token = robot.head_camera.events.camera_calibration_changed.subscribe(on_calibration)
```

设备连断另有 `camera_device_connection_changed`（payload 为 `DeviceConnectionEvent`）。
