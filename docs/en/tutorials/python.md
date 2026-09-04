---
title: Your First Program (Python)
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Your First Program (Python)

This tutorial walks through a complete session in a dozen lines: connect to the robot → wait until ready → read robot-wide info → call two capabilities → disconnect automatically.

## Prerequisites

- The SDK is installed and `import fabot` works; see [Installing the Python SDK](../install/python.md) and [Requirements](../install/requirements.md).
- The robot's control-plane endpoint (IP + port, default 7557) is reachable over the network.
- No real robot? Run the same flow offline with `Robot.mock()`; see [Mock Testing](../usage/mock.md).

## Complete Code

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()                       # wait for bound and required slots to become ready

    print("Platform version:", robot.version())
    print("Robot state:", robot.state().state)

    # Call a capability: show text on the face screen
    applied = robot.screen.show_text(text="Hello, fabot!")
    print("Screen result:", applied.outcome.success)

    # Read an IO input
    level = robot.io.get_digital_input(channel="di_1")
    print("di_1 =", level.value)
# close() runs automatically when the with block exits
```

Replace the IP with your robot's address, save as `hello_fabot.py`, and run `python3 hello_fabot.py`.

## Walkthrough

- `Robot.connect(ip, port)`: connects to the control-plane endpoint; the `with` block guarantees `close()` on exit. For other connection styles (`from_endpoint` / `from_config` / `mock`) and `ClientOptions`, see [Connection & the Robot Entry Point](../usage/connection.md).
- `wait_ready()`: blocks until the bound, enabled, and required slots are ready; unbound optional slots do not block startup. The wait timeout is controlled by `ClientOptions.resolve_timeout_ms`.
- `version()` returns the platform version string; `state()` returns a `RobotState` snapshot whose `.state` field is the robot-wide run state (`RobotRunState`). See [Status, Faults & Lifecycle](../usage/status-faults.md).
- Capabilities are accessed through read-only slot properties (`robot.screen`, `robot.io`, and so on — 22 slots in total). Every call returns a result object: `applied.outcome.success` from `show_text` reports success, and `level.value` from `get_digital_input` is the current level. Field details are on the [Screen](../reference/python/screen.md) and [IO](../reference/python/io.md) reference pages.
- Calling an unbound slot raises `AdapterUnbound`; on a real robot you can check `robot.io.has_adapter` first. Error types and handling are covered in [Error Handling](../usage/errors.md).

## Next Steps

- No robot? Develop offline with [Mock Testing](../usage/mock.md): `Robot.mock()`.
- Understand the call model: [Commands & Operations](../usage/commands-operations.md), [Events & Data Channels](../usage/events-channels.md).
- Look up a specific capability: [Reference](../reference/python/index.md).
- More complete code: [Examples (Python)](../examples/python/index.md).
