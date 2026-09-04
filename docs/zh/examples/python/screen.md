---
title: 面屏
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 面屏

控制机器人面屏：叠加文本、图片、视频背景与底部电量条。写操作模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [面屏](../../reference/python/screen.md)。

## 显示叠加文本与图片

背景图片与叠加文本相互独立：`show_image` 设置背景，`show_text` 在其上叠加一层文本，不打断背景。所有写操作返回 `ScreenStatusAppliedT`，`outcome.success` 是执行结果，`status` 是应用后的屏幕快照。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    applied = robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
    print(applied.outcome.success, applied.status.content)   # 2 (IMAGE)

    applied = robot.screen.show_text(text="任务执行中")
    print(applied.outcome.success, applied.status.overlayText)

    # 空字符串关闭叠加层，背景图片保持
    robot.screen.show_text(text="")
```

注意：

- `content` 取值为 `ScreenContent`：`IDLE`（1）/ `IMAGE`（2）/ `VIDEO`（3），可 `from fabot.capabilities.screen import ScreenContent` 后比较。
- 面屏的写操作共享同一显示资源，新命令排队执行；`get_status` 是只读查询，不排队，见 [面屏](../../reference/python/screen.md)。

## 循环播放视频与电量条

`play_video` 立即返回；`loop=True` 循环播放，直到被新内容替换或调用 `stop()`。电量条与画面内容独立，`percent` 取 0–100 显示，负数隐藏。

```python
from fabot import Robot
from fabot.capabilities.screen import ScreenContent

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    applied = robot.screen.play_video(
        uri="file:///usr/share/fabot/media/intro.mp4", loop=True,
    )
    print(applied.outcome.success, applied.status.playing)

    robot.screen.set_battery(percent=80)

    # 读取当前屏幕快照
    st = robot.screen.get_status().status
    print(st.content == ScreenContent.VIDEO, st.uri, st.playing, st.batteryPercent)

    # 停止播放并隐藏电量条
    robot.screen.stop()
    robot.screen.set_battery(percent=-1)
```

`loop=False` 播完一次后画面表现不作保证（可能停在末帧或黑屏），命令仍立即返回，见 [面屏 play_video](../../reference/python/screen.md#play_video)。
