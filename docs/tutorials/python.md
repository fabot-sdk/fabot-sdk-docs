---
title: 第一个程序（Python）
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 第一个程序（Python）

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()                       # 等待全部槽位就绪

    print("平台版本:", robot.version())
    print("整机状态:", robot.state())

    # 调用能力：让面屏显示文字
    robot.screen.show_text(text="Hello, fabot!")

    # 读取 IO 输入
    level = robot.io.get_digital_input(channel="di_1")
    print("di_1 =", level)
```

## 下一步

- 没有机器人？用 [Mock 测试](../usage/mock.md) 离线开发：`Robot.mock()`。
- 理解调用模型：[命令与长时操作](../usage/commands-operations.md)、[事件与数据通道](../usage/events-channels.md)。
- 查具体能力：[接口参考](../reference/python/index.md)。
- 更多完整代码：[使用示例（Python）](../examples/python/index.md)。
