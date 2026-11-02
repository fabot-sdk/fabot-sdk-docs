---
title: 面屏
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 面屏

控制机器人面屏：叠加文本、图片、视频与底部电量。写操作模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [面屏](../../reference/python/screen.md)。

## 显示叠加文本与图片

背景图片与叠加文本相互独立：`show_image` 设置背景，`show_text` 在其上叠加一层文本，不打断背景。所有写操作返回 `ScreenStatusApplied`，`outcome.success` 是执行结果，`status` 是应用后的屏幕快照。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["screen"])

    robot.screen.show_image("https://example.com/idle.png")
    applied = robot.screen.show_text("正在前往 3 号工位")
    print(applied.outcome.success, applied.status.overlay_text, applied.status.content)

    robot.screen.set_battery(76)          # 同步底部电量
```

`status.content` 是 `ScreenContent` 枚举（`IDLE` / `IMAGE` / `VIDEO`）。

## 播放视频并停止

```python
applied = robot.screen.play_video("https://example.com/loop.mp4", loop=True)
print(applied.status.content, applied.status.playing)

robot.screen.stop()
print(robot.screen.get_status().status.content)     # 回到 IDLE
```

## 读取状态

`status()` 给出能力级状态袋（`activity`：`idle` / `image` / `video`），`get_status()` 给出完整的屏幕快照：

```python
print(robot.screen.status().activity)       # Activity 是 StrEnum，可与字符串比较

snapshot = robot.screen.get_status().status
print(snapshot.content, snapshot.uri, snapshot.overlay_text, snapshot.battery_percent)
```

写命令共享资源 `display`，策略 `queue`：连发多条写命令会按顺序执行，`get_status()` 不占资源。
