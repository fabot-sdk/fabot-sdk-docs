---
title: Mock
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Mock

离线开发（Mock）。机制见 [Mock 测试](../../usage/mock.md)。

```python
from fabot import Robot

robot = Robot.mock()
robot.screen.on_show_text = lambda text: print("mock show_text:", text)

robot.screen.show_text(text="hello")   # 命中 mock 钩子
```
