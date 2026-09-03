---
title: Mock
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Mock

Offline development with Mock. See [Mock Testing](../../usage/mock.md) for the mechanism.

```python
from fabot import Robot

robot = Robot.mock()
robot.screen.on_show_text = lambda text: print("mock show_text:", text)

robot.screen.show_text(text="hello")   # hits the mock hook
```
