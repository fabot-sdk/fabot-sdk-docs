---
title: Your First Program (Python)
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Your First Program (Python)

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()                       # wait for all slots to become ready

    print("Platform version:", robot.version())
    print("Robot state:", robot.state())

    # Call a capability: show text on the face screen
    robot.screen.show_text(text="Hello, fabot!")

    # Read an IO input
    level = robot.io.get_digital_input(channel="di_1")
    print("di_1 =", level)
```

## Next Steps

- No robot? Develop offline with [Mock Testing](../usage/mock.md): `Robot.mock()`.
- Understand the call model: [Commands & Operations](../usage/commands-operations.md), [Events & Data Channels](../usage/events-channels.md).
- Look up a specific capability: [Reference](../reference/python/index.md).
- More complete code: [Examples (Python)](../examples/python/index.md).
