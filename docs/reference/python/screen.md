---
title: 面屏 Screen
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 面屏 Screen

## 模块概述

- 能力 id：`screen`；槽位：`robot.screen`
- 控制机器人面屏显示：文本、图片、视频，并查询当前播放状态。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `show_text` | `text` | `ScreenStatusAppliedT` | Command |
| `show_image` | `uri` | `ScreenStatusAppliedT` | Command |
| `play_video` | `uri`, `loop` | `ScreenStatusAppliedT` | Command |
| `stop` | — | `ScreenStatusAppliedT` | Command |
| `get_status` | — | `ScreenStatusAppliedT` | Command |

## 方法

```python
robot.screen.show_text(text="任务执行中")
robot.screen.show_image(uri="file:///usr/share/fabot/media/logo.png")
robot.screen.play_video(uri="file:///usr/share/fabot/media/intro.mp4", loop=True)
robot.screen.stop()
```

## 通道

## 事件

故障与生命周期变化经 `robot.screen.events` 的 `fault_changed` / `lifecycle_changed` 订阅，见 [事件与数据通道](../../usage/events-channels.md)。

## 异常

## 状态

本模块提供 GET-only 的 `status()`：

```python
st = robot.screen.status()
print(st.activity)   # Activity.IDLE / IMAGE / VIDEO
```

## 资源
