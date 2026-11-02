---
title: 灯效
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 灯效

控制灯带：切换灯效模式、颜色、亮度与动画周期。五个方法都是短命令，命令模型见 [命令与长时操作](../../usage/commands-operations.md)，接口见 [灯效](../../reference/python/light.md)。

## 设置灯效模式与颜色

`set_mode` 一次切换模式、颜色与动画周期；颜色用 `Rgb8`（`r` / `g` / `b`，各 0–255）。写命令返回生效后的灯带快照（`outcome` + `status`）。

```python
from fabot import Robot
from fabot.capabilities.light import LightMode
from fabot.types import Rgb8

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["light"])

    applied = robot.light.set_mode(
        LightMode.BREATHE,
        color=Rgb8(r=255, g=0, b=0),
        period_ms=2000,
    )
    print(applied.outcome.success, applied.status.mode, applied.status.period_ms)
```

`LightMode` 取值：`OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE`。`OFF` 与 `RAINBOW` 忽略颜色；`UNKNOWN` 不是合法命令值。

## 分别调颜色、亮度与周期

三个方法只改一项，其余保持：

```python
robot.light.set_color(r=0, g=255, b=0)
robot.light.set_brightness(128)
robot.light.set_period(500)

status = robot.light.get_status().status
print(status.mode, status.color, status.brightness, status.period_ms, status.led_count)
```

## 关灯

```python
from fabot.types import Rgb8

robot.light.set_mode(LightMode.OFF, color=Rgb8(r=0, g=0, b=0))
```

灯带没有数据通道，也没有长时任务；状态用 `get_status()` 查询，故障与生命周期变化经 `robot.light.events` 推送。
