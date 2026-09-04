---
title: 灯效
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 灯效

控制灯带：切换灯效模式、颜色、亮度与动画周期。灯效的五个方法都是短命令，命令模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [灯效](../../reference/python/light.md)。

## 设置灯效模式与颜色

`set_mode` 一次切换模式、颜色与动画周期；颜色用 `Rgb8T`（`r` / `g` / `b`，各 0–255）。写命令返回生效后的灯带快照。

```python
from fabot import Robot
from fabot.capabilities.light import LightMode
from fabot.types.Rgb8 import Rgb8T

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["light"])

    red = Rgb8T()
    red.r, red.g, red.b = 255, 0, 0
    applied = robot.light.set_mode(mode=LightMode.BREATHE, color=red, period_ms=2000)
    print(applied.outcome.success, applied.outcome.statusMessage)
    print(applied.status.mode, applied.status.periodMs, applied.status.ledCount)
```

注意：

- `LightMode` 取值 `OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE`；`OFF` / `RAINBOW` 忽略颜色，`period_ms` 对 `OFF` / `SOLID` 无可见效果，枚举全表见 [灯效](../../reference/python/light.md)。
- `set_mode` 不改变亮度，亮度用 `set_brightness` 单独调。

## 微调颜色、亮度与周期

模式不变、只改单项时用对应命令：

```python
applied = robot.light.set_color(r=0, g=255, b=0)      # 只改颜色
print(applied.outcome.success, applied.status.color.g)

applied = robot.light.set_brightness(brightness=128)  # 只改亮度（0–255）
print(applied.status.brightness)

applied = robot.light.set_period(period_ms=500)       # 只改动画周期（毫秒）
print(applied.status.periodMs)
```

## 读取当前灯带状态

```python
applied = robot.light.get_status()
status = applied.status
print(status.mode, status.brightness, status.periodMs)
print(status.color.r, status.color.g, status.color.b)
```

`get_status` 与三个写命令返回同一类型 `LightStatusAppliedT`（`outcome` / `status`），字段全表见 [灯效 get_status](../../reference/python/light.md#get_status)。
