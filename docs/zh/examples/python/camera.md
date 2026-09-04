---
title: 相机
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 相机

抓取图像帧、订阅相机图像流与预览播放地址。相机有四个槽位（`head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera`），同一套 API、各自独立。通道模型见 [事件与数据通道](../../usage/events-channels.md)，接口与字段见 [相机](../../reference/python/camera.md)。

## 抓取一组帧

`capture` 抓取当前一组彩色 + 深度帧，返回 `CaptureT`：结果经 `outcome` 判断，图像帧在 `color` / `depth` 字段中。`synchronized` 表示两帧是否同步采集。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    shot = robot.head_camera.capture()
    if shot.outcome is not None and shot.outcome.success:
        color = shot.color
        print("彩色帧:", color.width, "x", color.height, color.encoding,
              "| 同步:", shot.synchronized)
        if shot.depth is not None:
            print("深度帧:", shot.depth.width, "x", shot.depth.height)
    else:
        msg = shot.outcome.statusMessage if shot.outcome else "无结果"
        print("抓取失败:", msg)
```

注意：

- 抓取回传整帧像素字节（`ImageFrameT.data`），体积较大，只适合偶发拍照；实时画面请订阅通道。
- 只需要彩色或深度时，用 `capture_color` / `capture_depth`（返回字段为 `image` / `outcome`），避免传输不需要的一路。
- 抓取与通道订阅不占用 `camera_control` 资源，见 [相机](../../reference/python/camera.md)。

## 订阅帧组流

`frameset()` 订阅帧组流，每组包含彩色 / 深度 / 红外帧（`CameraFrameSetT`）。用 `frames()` 迭代，用完 `close()`。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    ch = robot.head_camera.frameset(qos_profile="latest")
    try:
        for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
            fs = frame.payload
            color = fs.color
            print("帧组", frame.sequence,
                  "| 同步:", fs.synchronized,
                  "| 彩色:", f"{color.width}x{color.height}" if color else None)
            if frame.sequence >= 30:   # 只演示前 30 组
                break
    finally:
        ch.close()
```

注意：

- 只要彩色或深度单路流时，用 `color()` / `depth()` 通道，`payload` 直接是 `ImageFrameT`，带宽更省。
- `qos_profile` 取 `"latest"`（只看最新）/ `"realtime"` / `"reliable"`；迭代参数与通用约定见 [事件与数据通道](../../usage/events-channels.md)。

## 打开相机会话与获取预览地址

需要特定分辨率 / 帧率时，先 `open` 按流配置打开会话（共享 `camera_control` 资源，请求排队执行），用完 `close`。桌面端预览可用 `rtsp()` 通道拿到播放地址（info-only 通道，无帧迭代）。

```python
from fabot import Robot
from fabot.capabilities.camera import StreamKind, StreamProfileT

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["head_camera"])

    profile = StreamProfileT()
    profile.stream = StreamKind.COLOR
    profile.width, profile.height, profile.fps = 1280, 720, 30
    profile.encoding = "rgb8"

    session = robot.head_camera.open(profiles=[profile], enable_sync=True)
    print("会话状态:", session.state, "| slot:", session.cameraSlot)
    if session.outcome is not None:
        print("结果:", session.outcome.success, session.outcome.statusMessage)

    with robot.head_camera.rtsp() as ch:
        print("RTSP 预览地址:", ch.info.url)

    robot.head_camera.close()
```
