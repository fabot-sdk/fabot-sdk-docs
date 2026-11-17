---
title: IO 示例
status: draft
owner: fabot-core
updated: 2026-11-17
---

# IO 示例

占用一条 GPIO 线、写电平、再读回确认。接口见 [IO](../../reference/python/io.md)。

一条线由芯片与片内线号共同确定，先看这台机器上有什么：

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    for chip in robot.io.chips().chips:
        print(chip.name, chip.label, len(chip.lines))
```

拿到芯片标签与线号后，按「占用 → 读写 → 释放」走一遍：

```python
with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["io"])

    robot.io.acquire(
        chip="tegra264-gpio",
        line=17,
        direction=PinDirection.OUTPUT,
        value=False,
    )
    try:
        applied = robot.io.set_level(chip="tegra264-gpio", line=17, value=True)
        print("写入:", applied.outcome.success, applied.value)

        level = robot.io.get_level(chip="tegra264-gpio", line=17)
        print("读回:", level.value)
    finally:
        robot.io.release(chip="tegra264-gpio", line=17)
```

## 读取外部输入

`PinDirection.INPUT` 方向的线只用 `get_level` 读取，不能 `set_level`：

```python
robot.io.acquire(
    chip="tegra264-gpio",
    line=18,
    direction=PinDirection.INPUT,
    value=False,
)
try:
    print(robot.io.get_level(chip="tegra264-gpio", line=18).value)
finally:
    robot.io.release(chip="tegra264-gpio", line=18)
```

`INPUT` 方向的 `value` 会被忽略，但签名里是必填参数，照传 `False` 即可。

## 找出空闲的线

`chips()` 里每条线的 `consumer` 为空表示当前没人占用；`name` 是内核给的线名，通常能看出这根线接的是什么：

```python
for chip in robot.io.chips().chips:
    for line in chip.lines:
        if not line.consumer:
            print(chip.label or chip.name, line.line, line.name)
```

注意：

- `acquire` 同一条线、同一方向重复调用是幂等的，且不会改写已输出的电平；要改方向必须先 `release`。
- 未占用的线上调用 `set_level` / `get_level` 会抛 `FabotError`（`NotSupported`），不是返回 `outcome.success` 为 `False` 的响应。要区分「命令被拒绝」与「命令执行失败」，用 `try/except` 捕获，见 [错误处理](../../usage/errors.md)。
- `PinDirection.UNKNOWN` 不是合法命令值，传入会被拒绝。
- `chip` 优先按标签匹配；标签为空的芯片直接用 `gpiochipN` 这类设备名。线号是**片内偏移**，不是整机全局脚号，`17` / `18` 只是示例。
